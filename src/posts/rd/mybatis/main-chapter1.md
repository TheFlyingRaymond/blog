---
icon: pen-to-square
date: 2024-12-22
category:
  - 计算机
tag:
  - MyBatis
  - Database
  - ORM
---

# 【主线】实现MyBatis：Chapter1: 代理框架搭建
搭建整体代理执行框架

<!-- more -->
## 一、Java 动态代理
Mybatis 中可以通过接口方法调用直接与数据库交互的核心技术就是 Java 动态代理。所谓 Java 动态代理，可以理解为 Java 对代理模式的一种深度支持，允许程序在运行时创建代理类。具体一点来说，JDK 提供了 Proxy.newProxyInstance方法来支持代理对象的创建。
```java
public static Object newProxyInstance(ClassLoader loader,
                                       Class<?>[] interfaces,
                                       InvocationHandler h)
        throws IllegalArgumentException{}


public interface InvocationHandler {
    public Object invoke(Object proxy, Method method, Object[] args)
        throws Throwable;
}
```
从代码中我们可以看到，newProxyInstance方法入参需要一个类加载器、一组要实现的接口以及一个 InvocationHandler 的实例，最终返回的 Object代理对象即为该组接口的实现实例。而对 InvocationHandler而言，其需要实现的是 invoke方法，入参见名知意不再赘述，该方法在通过代理对象进行对应的接口方法调用时会得到执行，此时我们即可以根据需求进行相应的处理，具体对应到我们的场景中，就是将 Mapper 的方法调用直接与 DB 操作关联

## 二、MyBatis 代理框架
单纯的 Java 动态地理逻辑并不复杂，但是我们在使用 MyBatis 的过程中也不会自己创建代理对象，所以我们本章也将代理的创建与 MyBatis 的整体运行结合起来，在理解动态代理的逻辑基础上，更关系 MyBatis 是在何时何地以何种方式悄咪咪给我们返回了代理对象。

本章涉及到的类包括 SqlSessionFactory、SqlSession、Configuration、MapperProxy以及 MapperProxyFactory，整体流程是
● SqlSessionFactory在创建时会扫描配置信息，将所有信息汇聚成Configuration进行记录，其中对于每一个 Mapper 接口在解析完相应信息后会创建MapperProxyFactory对象，并维护好 Mapper 类到MapperProxyFactory对象的映射关系，该映射及其余的一些信息被封装为 MapperRegistry
● 我们通过SqlSession获取Mapper实例时，会通过Configuration获取到映射信息，进而拿到MapperProxyFactory对象后创建真正的MapperProxy实例，该实例也是我们业务代码中持有的真实对象
● 我们通过MapperProxy对象进行接口方法调用时方法被拦截，进而执行相关的 DB 操作

### 2.1 代理相关类
我们定义一个简单对象作为我们的测试类
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Country {
    private Long id;
    private String countryName;
    private String countryCode;
}
```

首先来创建的我们核心的代理类MapperProxy，但是本章我们暂不处理真实的 DB 逻辑，只返回一个 mock 数据，让我们的程序先转起来。
```java
@Slf4j
public class MapperProxy<T> implements InvocationHandler {
    private SqlSession sqlSession;
    private Class<?> mapperInterface;

    public MapperProxy(SqlSession sqlSession, Class<?> mapperInterface) {
        this.sqlSession = sqlSession;
        this.mapperInterface = mapperInterface;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        log.info("MapperProxy代理执行方法:{}", method.getName());
        Country mock = new Country();
        mock.setId(110L);
        mock.setCountryCode("MOCK");
        mock.setCountryName("这是一个假的数据");
        return mock;
    }
}
```

接下来我们创建MapperProxyFactory，该类在配置扫描的过程中会被实例化，同时会记录一些接口粒度的相关信息，但目前我们还没有这些信息，所有它看起还比较单薄
::: info
这里工厂类的代理构建方法接受了一个 SqlSession类型的参数，这是因为我们的代理类中最终只会负责执行逻辑的转移，而真正的执行逻辑是在SqlSession 中转交给最后的执行器执行的
:::

```java
public class MapperProxyFactory<T> {
    private Class<T> mapperInterface;

    public MapperProxyFactory(Class<T> mapperInterface) {
        this.mapperInterface = mapperInterface;
    }

    public <T> T newInstance(SqlSession sqlSession) {
        MapperProxy<T> mapperProxy = new MapperProxy<>(sqlSession, mapperInterface);
        return newInstance(mapperProxy);
    }

    private <T> T newInstance(MapperProxy<T> mapperProxy) {
        return (T) Proxy.newProxyInstance(mapperInterface.getClassLoader(), new Class[]{mapperInterface}, mapperProxy);
    }
}
```
### 2.2 配置相关类
首先是两个接口的定义，目前接口中定义的方法也正好能对应我们对 MyBatis 最简单的使用场景
```java
//CountryMapper mapper = sqlSessionFactory.openSession().getMapper(CountryMapper.class);

public interface SqlSession {
    <T> T getMapper(Class<T> type);
}

public interface SqlSessionFactory {
    SqlSession openSession();
}

接下来是 MapperRegistry，目前这里面也只维护了一个映射关系以及对应一些 get、set 方法
public class MapperRegistry {
    private Configuration configuration;

    private Map<Class<?>, MapperProxyFactory<?>> knownMappers = new HashMap<>();

    public MapperRegistry(Configuration configuration) {
        this.configuration = configuration;
    }

    public void addMapper(Class<?> type) {
        MapperProxyFactory<?> mapperProxyFactory = new MapperProxyFactory<>(type);
        knownMappers.put(type, mapperProxyFactory);
    }

    public <T> T getMapper(Class<T> type, SqlSession sqlSession) {
        MapperProxyFactory<T> mapperProxyFactory = (MapperProxyFactory<T>) knownMappers.get(type);
        return mapperProxyFactory.newInstance(sqlSession);
    }
}
```

最后，对于 SqlSessionFactory和SqlSession的实现类，我们先暂时使用 mock 数据。我们的 MockSqlSessionFactory会返回一个 MockSqlSession实例，而后者在创建会自动添加一个 CountryMapper对应的代理映射关系
```java
public class MockSqlSession implements SqlSession {
    private final Configuration configuration;
    private MapperRegistry mapperRegistry;

    public MockSqlSession(Configuration configuration) {
        this.configuration = configuration;
        this.mapperRegistry = new MapperRegistry(configuration);
        mapperRegistry.addMapper(CountryMapper.class);
    }

    @Override
    public <T> T getMapper(Class<T> type) {
        return mapperRegistry.getMapper(type, this);
    }
}

public class MockSqlSessionFactory implements SqlSessionFactory {
    @Override
    public SqlSession openSession() {
        return new MockSqlSession(new Configuration());
    }
}
```
至此，我们简单的代理框架搭建完毕，现在我们的目录结构如下:
```
.
└── mybatis
    ├── binding
    │   └── MapperRegistry.java
    ├── proxy
    │   ├── MapperProxy.java
    │   └── MapperProxyFactory.java
    ├── session
    │   ├── Configuration.java
    │   ├── MockSqlSession.java
    │   ├── MockSqlSessionFactory.java
    │   ├── SqlSession.java
    │   └── SqlSessionFactory.java
    └── testdata
        ├── CountryMapper.java
        └── dao
            └── Country.java
```
## 三、执行测试
加下来，编写一个简单的测试代码，通过最总的输出，我们确定我们的代理逻辑确实生效了~ 下一步我们将通过对 DB 配置信息的解析，从数据库中获取一条真实的数据
```java
@Slf4j
public class MapperProxyTest {
    @Test
    public void test() {
        CountryMapper mapper = new MockSqlSessionFactory().openSession().getMapper(CountryMapper.class);
        Country country = mapper.selectTestCountry();
        log.info("country:{}", country);
        Assert.assertNotNull(country);
    }
}

// 输出：
// - MapperProxy代理执行方法:selectTestCountry
// - country:Country(id=110, countryName=这是一个假的数据, countryCode=MOCK)
```
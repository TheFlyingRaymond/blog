---
icon: pen-to-square
date: 2024-12-21
category:
  - 计算机
tag:
  - MyBatis
  - Database
---

# 【主线】实现MyBatis：Chapter0: 介绍


<!-- more -->

MyBatis 是一个流行的 ORM 框架，广泛应用于 Java 项目中对数据库的访问，从使用者角度看，它最直观的特点就是实现了接口到 SQL 的绑定，让我们能够以访问 Java 接口的方式操作数据库，此外，它还具有配置方式灵活、动态 SQL 功能丰富、数据缓存以及插件等各种功能。
“造轮子”不是好的工作方式，但却是一个极好的学习方法，所有，这次我们就以造轮子的方式来进行对 MyBatis 的学习，目标是在保持架构基本一致的前提下实现其核心的增删改查及插件功能

首先来看一段最简单的 MyBatis 使用的代码
```java
public class Test {
    @org.junit.Test
    public void test() throws Exception {
        //step1：获取session工厂
        SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(Resources.getResourceAsReader("batis-config.xml"));
        //step2：获取session
        SqlSession sqlSession = sqlSessionFactory.openSession();
        //step3：获取mapper接口代理
        CountryMapper mapper = sqlSession.getMapper(CountryMapper.class);
        //step4：执行接口方法
        List<Country> countries = mapper.selectAll();
    }
}
```
代码大致可以分为四个部分：
1. 获取 session 工厂
2. 通过 session 工厂获取 session 对象
3. 通过 session 对象获取 mapper 代理
4. 通过 mapper 代理执行接口方法
上述四个步骤中，获取 session 对象这一步概念到实现上都相对简单，而其余的三步则分别对应了 MyBatis 核心的三块：配置解析、接口代理以及 逻辑执行

![mybatis整体运行流程](mybatis整体运行.png)

::: tip 
MyBatis 的设计思路是在解析阶段将所有信息构成一个 Configuration 对象，把该对象作为 session 工厂的属性之一，同一工厂实例下生产是 session 都共享同一个配置对象。该配置对象层层传递，在解析、执行的各个阶段都发挥重要作用。
:::
接下来我们将一步步实现 MyBatis 的核心功能

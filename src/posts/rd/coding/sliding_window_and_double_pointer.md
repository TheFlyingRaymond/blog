---
icon: pen-to-square
date: 2024-12-23
category:
  - 计算机
tag:
  - coding
---

# 滑窗与双指针

滑窗与双指针类问题的解题思路

<!-- more -->

## 滑窗问题

### 一、问题描述

滑窗类问题本身比较直白：给定一个区间范围，根据区间的某种特性来计算得到最终答案。


### 二、解题模板
以[643. 子数组最大平均数 I](https://leetcode.cn/problems/maximum-average-subarray-i/description/)为例:

::: code-tabs


@tab 伪代码

```shell
func(arr, k){
  //参数校验
  check(arr,k)

  //初始化滑窗,有可能arr的长度不足k
  var left=0, right = min(k,len(arr));
  for i = 0; i < right; i++{
    //处理窗口元素，比如累加
    handle(arr[i])
  }
  //此时执行一次结果更新，因为下面的循环可能不会走到
  updateRet();

  while right < len(arr){
    //初始化的过程中right索引处元素并未处理，所以这里处理right索引处元素后再修改right
    handle(arr[right++])
    handle(arr[left++])
    //滑窗内数据变更后执行一次结果更新
    updateRet();
  }

  //根据过程记录的信息得出结果
}
```


@tab Java

```java
class Solution {
    public double findMaxAverage(int[] nums, int k) {
        int sum = 0, max = 0;
        int left = 0, right = k;
        for (int i = 0; i < right; i++) {
            sum += nums[i];
        }
        max = sum;

        while (right < nums.length) {
            sum += nums[right++];
            sum -= nums[left++];
            max = Math.max(max, sum);
        }
        return (double) max / k;
    }
}
```

@tab go

```go
func findMaxAverage(nums []int, k int) float64 {
	sum, max := 0, 0
	left, right := 0, k

	for i := 0; i < right; i++ {
		sum += nums[i]
	}
	max = sum

	for right < len(nums) {
		sum += nums[right]
		right += 1
		sum -= nums[left]
		left += 1
		if sum > max {
			max = sum
		}
	}

	return float64(max) / float64(k)
}
```

:::


### 三、问题转化场景
|No.|场景|例题|备注|
|----|----|----|----|
|1|特殊元素数目|[1456. 定长子串中元音的最大数目](https://leetcode.cn/problems/maximum-number-of-vowels-in-a-substring-of-given-length/description/)||
|2|元素均值-->元素和|[643. 子数组最大平均数 I](https://leetcode.cn/problems/maximum-average-subarray-i/description/)||
|3|半径-->均值-->元素和|[2090. 半径为 k 的子数组平均值](https://leetcode.cn/problems/k-radius-subarray-averages/description/)|这个题还挺有意思的|


## 双指针问题

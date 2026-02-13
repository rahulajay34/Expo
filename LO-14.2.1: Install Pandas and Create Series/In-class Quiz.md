# In-Class Quiz

## Question 1
What is the primary difference between a NumPy array and a Pandas Series?
A. NumPy arrays can hold mixed data types, while Series cannot.
B. Series have a labeled index, while NumPy arrays use integer indices only.
C. Series are multidimensional, while NumPy arrays are always 1D.
D. There is no difference.

**Answer:** B

## Question 2
Which of the following creates a Pandas Series from a Python list `[10, 20]` with index `['a', 'b']`?
A. `pd.Series([10, 20], index=['a', 'b'])`
B. `pd.Series({'a': 10, 'b': 20})`
C. `pd.Series(index=['a', 'b'], data=[10, 20])`
D. All of the above

**Answer:** D (Technically A and C are explicit list constructors, B is dict which results in same structure. D is the best fit as all produce the desired Series output effectively).

## Question 3
If you run `pd.Series(5, index=[1, 2, 3])`, what is the result?
A. An error because data is scalar and index is list.
B. A Series with values [5, 5, 5] and index [1, 2, 3].
C. A Series with value [5] and index [1].
D. A Series with values [1, 2, 3] and index [5, 5, 5].

**Answer:** B

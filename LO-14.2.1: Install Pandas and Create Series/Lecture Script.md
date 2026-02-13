# Install Pandas and Create Series

## 1. Why Pandas?

**Why**: 
Real-world data is messy. It contains missing values, different data types (text, numbers, dates), and requires alignment. Pure Python lists or even NumPy arrays can be cumbersome for these tasks. We need a tool that handles labeled data efficiently.

**What**: 
Pandas is the "Excel for Python". It provides two main data structures: **Series** (1D) and **DataFrame** (2D). Today, we focus on the building block: the Series.

**How**:
Show the limitations of a Python list:
```python
# Lists don't have labeled indices
prices = [10.5, 20.0, 15.5]
# We have to remember that index 0 is 'Apple', 1 is 'Banana'... error prone.
```

## 2. Installing and Importing

**Why**: 
Standardization. We use `pd` so code is readable by others.

**What**: 
`import pandas as pd`

**How**: 
```python
import pandas as pd
import numpy as np # Often needed together
```

## 3. Creating a Series

**Why**: 
We need to store data with associated labels (indices) for easy retrieval and alignment.

**What**: 
`pd.Series(data, index=index)`

**How**:

**Scenario A: From a List (Default Index)**
```python
data = [10, 20, 30]
s = pd.Series(data)
print(s)
# Output shows index 0, 1, 2 automatically created.
```

**Scenario B: From a List with Custom Index**
```python
labels = ['a', 'b', 'c']
s = pd.Series(data, index=labels)
print(s)
# Now we can access s['a'] -> 10
```

**Scenario C: From a Dictionary**
Dictionaries already have key-value pairs, which map perfectly to index-value in Series.
```python
d = {'a': 10, 'b': 20, 'c': 30}
s = pd.Series(d)
print(s)
```

**Scenario D: From a Scalar**
Broadcasting a single value across an index.
```python
s = pd.Series(5, index=['a', 'b', 'c'])
# 5 is repeated for all indices.
```

**Demo URL**: [Pandas Series Documentation](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.Series.html)

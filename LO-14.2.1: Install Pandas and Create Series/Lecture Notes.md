# Install Pandas and Create Series

## Key Concepts
- **Pandas**: Library for data manipulation and analysis.
- **Series**: One-dimensional labeled array. Handles any data type.
- **Index**: The labels for the data points in a Series.

## Why Pandas? (Analogy)
Imagine you have a row of lockers. 
- A **Python List** is like lockers that are only numbered 0, 1, 2. You have to remember that locker 0 has your math book and locker 1 has your gym kit.
- A **Pandas Series** is like having name tags on those lockers. You can label one "Math" and another "Gym". You can still use the numbers if you want, but the labels make it much easier to find what you need instantly.

## Structure of a Series
A Series object consists of:
1. **Values**: The data array (backed by NumPy).
2. **Index**: The labels for the data.
3. **Name**: (Optional) Name of the Series.
4. **dtype**: The data type of the values.

## Creating Series

### 1. From a List
```python
import pandas as pd

data = [100, 200, 300]
s = pd.Series(data)
# 0    100
# 1    200
# 2    300
# dtype: int64
```

### 2. With Custom Index
```python
s = pd.Series(data, index=['Jan', 'Feb', 'Mar'])
# Jan    100
# Feb    200
# Mar    300
# dtype: int64
```

### 3. From a Dictionary
Keys become the index.
```python
population = {'London': 8.9, 'Paris': 2.1, 'Berlin': 3.6}
s = pd.Series(population)
# London    8.9
# Paris     2.1
# Berlin    3.6
# dtype: float64
```

### 4. From a Scalar
Repetitive value filling.
```python
s = pd.Series(0, index=['a', 'b', 'c'])
# a    0
# b    0
# c    0
# dtype: int64
```

## Key Attributes
- `s.values`: Returns the data as a NumPy array.
- `s.index`: Returns the index object.
- `s.shape`: Returns a tuple of the shape (n,).
- `s.dtype`: Returns the data type.

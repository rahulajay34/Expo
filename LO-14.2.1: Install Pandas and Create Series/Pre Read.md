# Install Pandas and Create Series

## 1. What is Pandas?
Pandas is a powerful open-source Python library built on top of NumPy. It provides high-performance, easy-to-use data structures and data analysis tools. While NumPy is excellent for numerical data, Pandas is designed for working with tabular, heterogeneous data (like SQL tables or Excel spreadsheets) and time series.

## 2. The Core Data Structure: Series
A **Series** is a one-dimensional labeled array capable of holding any data type (integers, strings, floating-point numbers, Python objects, etc.). The axis labels are collectively referred to as the **index**.

Think of a Series as a cross between a list and a dictionary:
- Like a list, you can access data by integer position.
- Like a dictionary, you can access data by a label (index).

## 3. Installation
To start using Pandas, you must first install it. Since it depends on NumPy, installing Pandas will often install NumPy as well if it's not present.

Using pip:
```bash
pip install pandas
```

Using conda:
```bash
conda install pandas
```

## 4. Importing Pandas
The standard convention for importing Pandas is:
```python
import pandas as pd
```
This alias `pd` is universally used in the data science community.

[Pandas Official Documentation: Intro to Data Structures](https://pandas.pydata.org/docs/user_guide/dsintro.html)

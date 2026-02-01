# Lecture Notes: 2D Arrays and Function Implementation

## Learning Objectives

- Create and manipulate 2D arrays using nested lists, avoiding common memory pitfalls
- Traverse 2D arrays row-wise, column-wise, and diagonally using nested loops
- Define Python functions with parameters, return values, and default arguments to solve modular problems
- Apply variable scope rules to read and modify local and global variables correctly

<div style="margin: 32px 0 20px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
  <h3 style="margin: 0; color: #334155;">Creating 2D Arrays: The Right Way and the Wrong Way</h3>
</div>

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">You already know how to create a simple list in Python—just throw some values in square brackets and you're done. But when you need to organize data in rows and columns (like a game board, a class roster, or a matrix), you need a 2D array. This is where many beginners make a critical mistake that causes bizarre bugs.</p>

<div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
  <div style="font-weight: 600; color: #475569; margin-bottom: 12px; font-size: 1.1em;">🎯 What is a 2D Array?</div>
  <p style="color: #64748b; margin: 0; line-height: 1.7;">A 2D array is a list of lists—each element of the outer list is itself a list representing a row. This structure lets you solve problems that require organizing data in two dimensions.</p>
</div>

### The Dangerous Shortcut (Don't Do This!)

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">You want to create a 3×3 matrix filled with zeros. Your first instinct might be to use Python's multiplication operator:</p>

```python
# This looks clever but creates a SERIOUS problem
matrix = [[0] * 3] * 3
print(matrix)
# [[0, 0, 0], [0, 0, 0], [0, 0, 0]]  # Looks fine so far...
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">When you try to change just one element:</p>

```python
matrix[0][0] = 9
print(matrix)
# [[9, 0, 0], [9, 0, 0], [9, 0, 0]]  # Wait... what?!
```

<div style="background-color: #fef7e6; border-left: 4px solid #f5a623; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #b8860b; margin-bottom: 8px;">⚠️ The Memory Trap</div>
  <p style="color: #92702b; margin: 0; line-height: 1.6;">When you use <strong>[[0] * 3] * 3</strong>, Python creates ONE inner list and then creates three references to that SAME list. All three rows point to the same memory location. Change one row, and you change them all. This is one of the most frustrating bugs for beginners because the matrix looks correct when you print it initially.</p>
  <p style="color: #92702b; margin: 8px 0 0 0; line-height: 1.6;">Why does this happen? When Python executes <strong>[[0] * 3] * 3</strong>, it first creates <strong>[0, 0, 0]</strong> in memory at location (say) 0x1000. Then it creates a list containing three references: <strong>[0x1000, 0x1000, 0x1000]</strong>. All three rows point to the same list. When you write <strong>matrix[0][0] = 9</strong>, you're modifying the list at 0x1000—and all three rows see that change because they all point there.</p>
</div>

### The Correct Way: List Comprehension

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">The solution is to create each row independently using a list comprehension with nested loops:</p>

```python
# The RIGHT way to create a 2D array
matrix = [[0 for _ in range(3)] for _ in range(3)]
print(matrix)
# [[0, 0, 0], [0, 0, 0], [0, 0, 0]]

# Now changing one element works correctly
matrix[0][0] = 9
print(matrix)
# [[9, 0, 0], [0, 0, 0], [0, 0, 0]]  # Perfect!
```

<div style="background-color: #e8f4fd; border-left: 4px solid #4a90d9; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #2d6cb5; margin-bottom: 8px;">How the List Comprehension Works</div>
  <p style="color: #3d7abf; margin: 0; line-height: 1.6;">The outer loop <strong>[... for _ in range(3)]</strong> creates three rows. The inner loop <strong>[0 for _ in range(3)]</strong> creates three zeros for each row. The underscore <strong>_</strong> is a Python convention meaning "I don't care about this variable"—you could use <strong>i</strong> or <strong>j</strong>, but <strong>_</strong> signals you won't use the loop variable anywhere.</p>
</div>

### Manual Creation for Small Arrays

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">For small arrays with specific values, you can create them manually:</p>

```python
# Manually creating a 3x3 matrix
matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]

# Accessing elements: matrix[row][column]
print(matrix[0][1])  # Prints 2 (first row, second column)
print(matrix[2][2])  # Prints 9 (third row, third column)
```

<div style="background-color: #f3e8ff; border-left: 4px solid #a855f7; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #7c3aed; margin-bottom: 8px;">Row First, Column Second</div>
  <p style="color: #6d28d9; margin: 0; line-height: 1.6;">The first index <strong>[0]</strong> takes you to a row (a complete list). The second index <strong>[1]</strong> takes you to a specific element within that row.</p>
</div>

<div style="margin: 32px 0 20px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
  <h3 style="margin: 0; color: #334155;">Traversing 2D Arrays: Seeing Every Element</h3>
</div>

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Once you have a 2D array, you need to access its elements systematically. The key insight: you need nested loops because you're working with nested lists. The outer loop handles rows, the inner loop handles columns within each row.</p>

### Understanding the Basics: What Does a For Loop See?

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">When you loop over a regular list:</p>

```python
simple_list = [1, 2, 3]
for element in simple_list:
    print(element)
# Output: 1, then 2, then 3
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">In a 2D array, what are the "elements" of the outer list?</p>

```python
matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]

# Loop over the matrix
for row in matrix:
    print(row)
# Output:
# [1, 2, 3]
# [4, 5, 6]
# [7, 8, 9]
```

<div style="background-color: #e6f7ed; border-left: 4px solid #4ade80; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #16a34a; margin-bottom: 8px;">The Outer Loop Gives You Rows, Not Numbers</div>
  <p style="color: #22863a; margin: 0; line-height: 1.6;">The outer loop gives you complete rows (entire lists), not individual numbers. If you want individual numbers, you need a second loop to iterate through each row.</p>
</div>

### Row-Wise Traversal: Reading Left to Right, Top to Bottom

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Row-wise traversal means processing the first row completely, then the second row, then the third—like reading a book. This is the most common pattern:</p>

<div style="background-color: #e8f4fd; border-left: 4px solid #4a90d9; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #2d6cb5; margin-bottom: 8px;">Keeping Output on One Line</div>
  <p style="color: #3d7abf; margin: 0; line-height: 1.6;">By default, <strong>print()</strong> adds a newline after each value. The parameter <strong>end=' '</strong> replaces that newline with a space, keeping output on one line. Without <strong>end=' '</strong>, each number would print on its own line.</p>
</div>

```python
matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]

# Row-wise traversal using indices
for i in range(len(matrix)):           # Outer loop: 0, 1, 2 (rows)
    for j in range(len(matrix[i])):    # Inner loop: 0, 1, 2 (columns)
        print(matrix[i][j], end=' ')
# Output: 1 2 3 4 5 6 7 8 9
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Here's how the nested loops execute, step by step:</p>

```
Iteration | i | j | matrix[i][j]
----------|---|---|-------------
1         | 0 | 0 | 1
2         | 0 | 1 | 2
3         | 0 | 2 | 3
4         | 1 | 0 | 4
5         | 1 | 1 | 5
6         | 1 | 2 | 6
7         | 2 | 0 | 7
8         | 2 | 1 | 8
9         | 2 | 2 | 9
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">The outer loop stays at i=0 while the inner loop runs through all j values (0, 1, 2). Then i advances to 1, and the inner loop runs again through all j values. This pattern continues until all elements are visited.</p>

### Column-Wise Traversal: Reading Top to Bottom, Left to Right

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Column-wise traversal processes the first column completely, then the second column, then the third. You just swap the loop order:</p>

```python
# Column-wise traversal
for j in range(len(matrix[0])):        # Outer loop: columns (0, 1, 2)
    for i in range(len(matrix)):       # Inner loop: rows (0, 1, 2)
        print(matrix[i][j], end=' ')
# Output: 1 4 7 2 5 8 3 6 9
```

<div style="background-color: #e8f4fd; border-left: 4px solid #4a90d9; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #2d6cb5; margin-bottom: 8px;">Loop Order vs Indexing Order</div>
  <p style="color: #3d7abf; margin: 0; line-height: 1.6;">Notice the swap: the outer loop now runs through columns (j), and the inner loop runs through rows (i). But when accessing the element, you still write <strong>matrix[i][j]</strong> (row first, then column). The loop order determines traversal direction, not the indexing syntax.</p>
</div>

### Diagonal Traversal: A Special Case

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">For square matrices, the diagonal runs from the top-left to bottom-right where the row index equals the column index:</p>

```python
# Diagonal traversal (only works for square matrices)
for i in range(len(matrix)):
    print(matrix[i][i], end=' ')
# Output: 1 5 9
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">You only need one loop because the row and column indices are always the same: (0,0), (1,1), (2,2).</p>

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">For the anti-diagonal (top-right to bottom-left), the row and column indices sum to n-1:</p>

```python
# Anti-diagonal traversal
for i in range(len(matrix)):
    print(matrix[i][len(matrix)-1-i], end=' ')
# Output: 3 5 7
```

<div style="margin: 32px 0 20px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
  <h3 style="margin: 0; color: #334155;">Arrays of Dictionaries: Organizing Complex Data</h3>
</div>

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Sometimes you need more structure than numbers in a grid. What if each element needs multiple attributes? Why not just use a simple list of dictionaries? Because sometimes data naturally organizes into rows and columns—like students grouped by classroom and seat position, or products organized by aisle and shelf. The 2D structure preserves that spatial relationship.</p>

<div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
  <div style="font-weight: 600; color: #475569; margin-bottom: 12px; font-size: 1.1em;">🎯 Real-World Scenario: Student Records</div>
  <p style="color: #64748b; margin: 0; line-height: 1.7;">You have a 2D array of students where each element is a dictionary storing students' names and marks.</p>
</div>

```python
# 2D array of student records (2 rows, 2 columns)
students = [
    [
        {"name": "Amit", "marks": 85},
        {"name": "Neha", "marks": 90}
    ],
    [
        {"name": "Rahul", "marks": 78},
        {"name": "Priya", "marks": 88}
    ]
]
```

### Accessing Dictionary Elements in a 2D Array

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">To access a specific student's name or marks, you combine list indexing with dictionary key access:</p>

```python
# Access the first student's name (row 0, column 0)
print(students[0][0]["name"])  # Amit

# Access the second student's marks (row 0, column 1)
print(students[0][1]["marks"])  # 90
```

### Traversing to Print All Records

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">When you loop through this structure, the outer loop gives you rows, and the inner loop gives you individual student dictionaries:</p>

```python
# Print all student records
for row in students:
    for record in row:
        print(f"{record['name']} scored {record['marks']}")

# Output:
# Amit scored 85
# Neha scored 90
# Rahul scored 78
# Priya scored 88
```

<div style="background-color: #e8f4fd; border-left: 4px solid #4a90d9; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #2d6cb5; margin-bottom: 8px;">Safer Dictionary Access with .get()</div>
  <p style="color: #3d7abf; margin: 0; line-height: 1.6;">Instead of <strong>record["name"]</strong>, you can use <strong>record.get("name")</strong>. The <strong>.get()</strong> method returns <strong>None</strong> if the key doesn't exist, preventing crashes.</p>
</div>

<div style="margin: 32px 0 20px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
  <h3 style="margin: 0; color: #334155;">Python Functions: Writing Reusable Code</h3>
</div>

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Imagine you need to calculate the average of five different lists in your program. Without functions, you copy-paste the same sum-and-divide logic five times. Change how you calculate the average? Now you need to update five places. Functions let you write the logic once and call it five times. Change it once, and all five calls get the update automatically.</p>

<div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
  <div style="font-weight: 600; color: #475569; margin-bottom: 12px; font-size: 1.1em;">What is a Function?</div>
  <p style="color: #64748b; margin: 0; line-height: 1.7;">A function is a reusable block of code that takes inputs (parameters), performs operations, and optionally returns an output. Think of it like a recipe: you provide ingredients (inputs), follow steps (function body), and get a dish (output). Functions are defined by two things: the parameters you pass to them, and the return value you get back.</p>
</div>

### Defining Your First Function

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">The syntax for defining a function in Python uses the <strong>def</strong> keyword, followed by the function name, parentheses for parameters, and a colon. Everything indented below belongs to the function:</p>

```python
def double(number):
    result = number * 2
    return result

# Call the function with different values
print(double(5))   # 10
print(double(7))   # 14
print(double(20))  # 40
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">The function takes a parameter <strong>number</strong>, doubles it, and returns the result. Call it with different arguments, and you get different outputs—without rewriting the doubling logic.</p>

<div style="background-color: #fef7e6; border-left: 4px solid #f5a623; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #b8860b; margin-bottom: 8px;">⚠️ Indentation is Critical</div>
  <p style="color: #92702b; margin: 0; line-height: 1.6;">Python uses indentation to define what belongs inside a function. All lines inside the function MUST be indented by the same amount (typically 4 spaces). If you forget the indentation, Python will throw an <strong>IndentationError</strong>.</p>
</div>

### Functions with Multiple Parameters

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Functions become even more useful when they accept multiple parameters:</p>

```python
def add(a, b):
    return a + b

# Use the function
result = add(10, 20)
print(result)  # 30

# You can call it directly in a print statement
print(add(71, 19))  # 90
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">The <strong>a</strong> and <strong>b</strong> are parameters—placeholders for values you'll provide when calling the function. The <strong>return</strong> keyword sends the result back to wherever the function was called.</p>

<div style="background-color: #e6f7ed; border-left: 4px solid #4ade80; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #16a34a; margin-bottom: 8px;">Write Once, Use Everywhere</div>
  <p style="color: #22863a; margin: 0; line-height: 1.6;">You wrote the addition logic once. Now you can add any two numbers anywhere in your program by calling <strong>add(x, y)</strong>. Change the parameters, get a different result. This is the essence of reusability.</p>
</div>

### Default Arguments: Making Parameters Optional

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Sometimes you want a parameter to have a default value if the caller doesn't provide one. This makes functions more flexible:</p>

```python
def power(base, exp=2):
    return base ** exp

# Call with one argument (uses default exp=2)
print(power(5))      # 25 (5 squared)

# Call with two arguments (overrides default)
print(power(5, 3))   # 125 (5 cubed)
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">The <strong>exp=2</strong> syntax means "if the caller doesn't provide <strong>exp</strong>, use 2 as the default."</p>

<div style="background-color: #fef7e6; border-left: 4px solid #f5a623; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #b8860b; margin-bottom: 8px;">⚠️ Required vs Optional Parameters</div>
  <p style="color: #92702b; margin: 0 0 8px 0; line-height: 1.6;">You must provide at least the <strong>base</strong> argument. Calling <strong>power()</strong> with no arguments causes a <strong>TypeError</strong> because <strong>base</strong> has no default value. Only parameters with defaults (like <strong>exp=2</strong>) are optional.</p>
  <p style="color: #92702b; margin: 8px 0; line-height: 1.6;">The number of arguments you pass must match the number of parameters (unless some have defaults). Here's what happens when you get it wrong:</p>
</div>

```python
def add(a, b):
    return a + b

# This causes an error:
# add(5)  
# TypeError: add() missing 1 required positional argument: 'b'

# This also causes an error:
# add(5, 10, 15)  
# TypeError: add() takes 2 positional arguments but 3 were given
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Python tells you exactly what went wrong: either you didn't provide enough arguments, or you provided too many.</p>

<div style="margin: 32px 0 20px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
  <h3 style="margin: 0; color: #334155;">Variable Scope: Local vs Global</h3>
</div>

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">When you define a variable inside a function, where can you use it? What happens if you define a variable with the same name inside and outside a function? These questions are about <strong>scope</strong>—the region of code where a variable is accessible.</p>

<div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
  <div style="font-weight: 600; color: #475569; margin-bottom: 12px; font-size: 1.1em;">Two Types of Scope</div>
  <p style="color: #64748b; margin: 0; line-height: 1.7;"><strong>Local scope</strong> means a variable exists only inside the function where it's defined. Once the function finishes, the variable disappears. <strong>Global scope</strong> means a variable is defined outside all functions and can be accessed anywhere in your code.</p>
</div>

### Local Variables: Trapped Inside Functions

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Variables defined inside a function are local to that function. You can't access them outside:</p>

```python
def show():
    x = 5  # Local variable
    print(x)

show()  # Prints 5

# Trying to access x here would cause an error
# print(x)  # NameError: name 'x' is not defined
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">The variable <strong>x</strong> only exists while <strong>show()</strong> is running. Once the function ends, <strong>x</strong> is gone.</p>

### Global Variables: Accessible Everywhere

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Variables defined outside any function are automatically global. You can read them anywhere, including inside functions:</p>

```python
x = 10  # Global variable

def show():
    print(x)  # Reading the global variable

show()  # Prints 10
print(x)  # Also prints 10
```

### The Tricky Part: Local Overrides Global

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">What if you define a variable with the same name inside a function? The local version takes priority:</p>

```python
x = 10  # Global variable

def show():
    x = 5  # Local variable (different from global x)
    print(x)

show()  # Prints 5 (local x)
print(x)  # Prints 10 (global x unchanged)
```

<div style="background-color: #f3e8ff; border-left: 4px solid #a855f7; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #7c3aed; margin-bottom: 8px;">Local Shadows Global</div>
  <p style="color: #6d28d9; margin: 0; line-height: 1.6;">When you create a local variable with the same name as a global variable, the local version "shadows" the global one inside that function. The global variable still exists—it's just hidden while you're inside the function.</p>
</div>

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Here's a complete example showing how shadowing works:</p>

```python
x = 10  # Global variable

def test():
    x = 5  # Local variable (shadows global)
    print(f"Inside function: {x}")
    return x

result = test()
print(f"Outside function: {x}")
print(f"Returned value: {result}")

# Output:
# Inside function: 5
# Outside function: 10
# Returned value: 5
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">The global <strong>x</strong> remains 10 because the function created a separate local <strong>x</strong>. The assignment <strong>x = 5</strong> inside the function doesn't touch the global variable—it creates a new local one that disappears when the function ends.</p>

### Reading Global Variables

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">You can read a global variable inside a function without any special syntax:</p>

```python
price = 100  # Global variable

def calculate_tax():
    tax = price * 0.1  # Reading global variable
    print(f"Tax on \${price}: \${tax}")

calculate_tax()  # Tax on $100: $10.0
print(price)     # 100 (unchanged)
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">The function reads <strong>price</strong> without any issues. But trying to modify a global variable creates a problem.</p>

### The Problem: Modifying Global Variables

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">If you try to modify a global variable, Python gets confused:</p>

```python
count = 10  # Global variable

def increment():
    # count = count + 1  # UnboundLocalError!
    pass

# If you uncomment that line, Python crashes
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">When Python sees <strong>count = ...</strong>, it assumes you're creating a local variable. But you're also trying to read <strong>count</strong> on the right side before assigning to it. Python sees the assignment first and treats <strong>count</strong> as local, but then can't find a value for it yet. This causes an <strong>UnboundLocalError</strong>.</p>

### The Solution: The global Keyword

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">To modify a global variable inside a function, use the <strong>global</strong> keyword to tell Python you want the global version, not a new local one:</p>

```python
count = 10  # Global variable

def increment():
    global count  # Tell Python: use the global variable
    count = count + 1
    print(f"Count inside function: {count}")

print(f"Before: {count}")  # 10
increment()                 # Count inside function: 11
print(f"After: {count}")    # 11

increment()                 # Count inside function: 12
print(f"After again: {count}")  # 12
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">The <strong>global</strong> keyword tells Python: do not create a local variable—use the global one instead. Now the function can modify the global <strong>count</strong>, and those changes persist after the function ends.</p>

<div style="background-color: #fef7e6; border-left: 4px solid #f5a623; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #b8860b; margin-bottom: 8px;">⚠️ Avoid global When Possible</div>
  <p style="color: #92702b; margin: 0; line-height: 1.6;">Using <strong>global</strong> makes code harder to understand and debug. If ten functions all modify the same global variable, tracking down bugs becomes a nightmare. Instead, use function parameters and return values. Pass the variable as a parameter, modify it, and return the new value. This keeps your code predictable and testable.</p>
</div>

### Better Alternative: Parameters and Return Values

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Instead of modifying global variables, pass them as parameters and return the modified value:</p>

```python
def increment(value):
    return value + 1

count = 10
count = increment(count)  # 11
count = increment(count)  # 12
print(count)  # 12
```

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">This approach makes it clear where <strong>count</strong> changes. No hidden modifications, no confusion about which function changed what. The function takes a value, returns a new value, and you decide whether to use it.</p>
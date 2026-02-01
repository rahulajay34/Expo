# Pre-Read: 2D Arrays and Function Implementation

## What You'll Discover

- How to organize and process complex data like game boards, grade tables, and inventory systems using 2D arrays
- Why functions are the secret to writing code once and using it everywhere—no more copy-paste chaos
- How variable scope prevents naming conflicts and keeps your code organized
- How to build reusable tools that make your future coding life dramatically easier

## 🎮 When One List Isn't Enough

<div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 16px; padding: 24px 28px; margin: 24px 0; border: 1px solid #e9d5ff;">
  <div style="font-size: 1.2em; font-weight: 600; color: #7c3aed; margin-bottom: 12px;">🚀 The Big Picture</div>
  <p style="color: #6b21a8; margin: 0; line-height: 1.8; font-size: 1.05em;">You're building a tic-tac-toe game. You need to track nine squares arranged in rows and columns. Sure, you <em>could</em> create nine separate variables (square1, square2, square3...), but imagine checking for a winning diagonal. Your code would be a nightmare of if-statements spanning dozens of lines. There has to be a better way.</p>
</div>

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">This is exactly the problem that <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 500;">2D arrays</span> solve—organizing data that naturally lives in rows and columns, just like a spreadsheet, game board, or seating chart.</p>

## Understanding 2D Arrays: Lists Inside Lists

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
  <div style="font-weight: 600; color: #334155; margin-bottom: 12px; font-size: 1.1em;">🎯 What is a 2D Array?</div>
  <p style="color: #64748b; margin: 0; line-height: 1.7;">Your phone's photo gallery organizes photos by date (rows), with each date containing multiple photos (columns). A 2D array works the same way: it's a list where each element is <em>itself</em> a list. In Python, we create them using <strong>lists of lists</strong>.</p>
</div>

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Here's what a simple game board looks like as a 2D array:</p>

```python
board = [
    ['X', 'O', 'X'],
    ['O', 'X', 'O'],
    ['X', 'O', 'X']
]

# Access the middle square (row 1, column 1)
center = board[1][1]  # Returns 'X'
print(center)
```

**Output:**
```
X
```

```python
# Access different positions
print(board[0][2])  # Top-right corner
print(board[2][0])  # Bottom-left corner
```

**Output:**
```
X
X
```

<div style="background-color: #e0f2fe; border-left: 4px solid #0ea5e9; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #0284c7; margin-bottom: 8px;">💡 Quick Insight</div>
  <p style="color: #0369a1; margin: 0; line-height: 1.6;">Notice the double brackets? <code>board[1][1]</code> means "go to row 1, then within that row, go to column 1." Giving directions works the same way: "Go to the second floor, then walk to the second door."</p>
</div>

<div style="background-color: #ecfdf5; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
  <div style="font-weight: 600; color: #047857; margin-bottom: 16px;">✨ Why 2D Arrays Matter</div>
  <ul style="list-style: none; padding: 0; margin: 0;">
    <li style="padding: 10px 0 10px 28px; position: relative; color: #065f46; line-height: 1.6;"><span style="position: absolute; left: 0;">✓</span> <strong>Natural representation</strong>: Grade tables, game boards, and maps all have rows and columns—2D arrays mirror that structure perfectly</li>
    <li style="padding: 10px 0 10px 28px; position: relative; color: #065f46; line-height: 1.6;"><span style="position: absolute; left: 0;">✓</span> <strong>Powerful iteration</strong>: Loop through rows, then columns within each row—process entire grids with just a few lines of code</li>
    <li style="padding: 10px 0 10px 28px; position: relative; color: #065f46; line-height: 1.6;"><span style="position: absolute; left: 0;">✓</span> <strong>Scalability</strong>: Whether it's a 3×3 tic-tac-toe board or a 100×100 game map, the approach stays the same</li>
  </ul>
</div>

## Traversing 2D Arrays: The Nested Loop Pattern

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">To visit every element in a 2D array, you need <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 500;">nested loops</span>—an outer loop for rows and an inner loop for columns. Watch how the loops work together:</p>

```python
grades = [
    [85, 92, 78],  # Student 1's test scores
    [90, 88, 95],  # Student 2's test scores
    [76, 81, 89]   # Student 3's test scores
]

# Print all grades with their positions
for row_index in range(len(grades)):
    for col_index in range(len(grades[row_index])):
        score = grades[row_index][col_index]
        print(f"Student {row_index + 1}, Test {col_index + 1}: {score}")
```

**Output:**
```
Student 1, Test 1: 85
Student 1, Test 2: 92
Student 1, Test 3: 78
Student 2, Test 1: 90
Student 2, Test 2: 88
Student 2, Test 3: 95
Student 3, Test 1: 76
Student 3, Test 2: 81
Student 3, Test 3: 89
```

### How the Loops Execute

Watch how the inner loop completes entirely before the outer loop advances to the next row:

- **Step 1**: row_index=0, col_index=0 → grades[0][0] = 85
- **Step 2**: row_index=0, col_index=1 → grades[0][1] = 92
- **Step 3**: row_index=0, col_index=2 → grades[0][2] = 78
- **Step 4**: row_index=1, col_index=0 → grades[1][0] = 90 (outer loop advances)
- **Step 5**: row_index=1, col_index=1 → grades[1][1] = 88
- **Step 6**: row_index=1, col_index=2 → grades[1][2] = 95

The pattern continues: the inner loop runs through all columns for row 0, then all columns for row 1, then all columns for row 2.

<div style="background-color: #fef7e6; border-left: 4px solid #f5a623; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #b8860b; margin-bottom: 8px;">⚠️ Common Beginner Mistake</div>
  <p style="color: #92702b; margin: 0; line-height: 1.6;">Forgetting that the outer loop runs <em>completely</em> before moving to the next row. For each single step of the outer loop, the inner loop runs <em>all the way through</em>. Think of it like reading a book: you finish an entire row of words (inner loop) before moving to the next line (outer loop).</p>
</div>

## From Repetitive Code to Reusable Functions

<div style="display: flex; gap: 16px; margin: 24px 0; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 250px; background-color: #fef2f2; border-radius: 12px; padding: 16px 20px;">
    <div style="font-weight: 600; color: #dc2626; margin-bottom: 10px;">❌ The Copy-Paste Nightmare</div>
    <p style="color: #991b1b; margin: 0; line-height: 1.6; font-size: 0.95em;">You need to calculate the average of three different grade lists. You write the same 5 lines of code three times. Later, you find a bug in the calculation—now you have to fix it in three places. Miss one spot? Your program gives inconsistent results.</p>
  </div>
  <div style="flex: 1; min-width: 250px; background-color: #f0fdf4; border-radius: 12px; padding: 16px 20px;">
    <div style="font-weight: 600; color: #16a34a; margin-bottom: 10px;">✓ The Function Solution</div>
    <p style="color: #166534; margin: 0; line-height: 1.6; font-size: 0.95em;">You write the calculation logic <em>once</em> inside a function. Now you can use it anywhere by just calling the function's name. Bug fix? Change it in one place, and everywhere that uses the function automatically gets the fix.</p>
  </div>
</div>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
  <div style="font-weight: 600; color: #334155; margin-bottom: 12px; font-size: 1.1em;">🎯 What is a Function?</div>
  <p style="color: #64748b; margin: 0; line-height: 1.7;">Consider a recipe: instead of writing out "crack 2 eggs, whisk them, add salt" every time you cook, you just say "make scrambled eggs" and follow the recipe you wrote once. In Python, functions let you bundle reusable code under a name you can call, then run that code anytime by using the name.</p>
</div>

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Here's a function that calculates the average of any list of numbers:</p>

```python
def calculate_average(numbers):
    total = sum(numbers)
    count = len(numbers)
    return total / count

# Use it with different data
test_scores = [85, 92, 78, 90]
quiz_scores = [10, 9, 8, 10, 9]

print(f"Test average: {calculate_average(test_scores)}")
print(f"Quiz average: {calculate_average(quiz_scores)}")
```

**Output:**
```
Test average: 86.25
Quiz average: 9.2
```

<div style="background-color: #e0f2fe; border-left: 4px solid #0ea5e9; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #0284c7; margin-bottom: 8px;">💡 Quick Insight</div>
  <p style="color: #0369a1; margin: 0; line-height: 1.6;">The <code>numbers</code> inside the parentheses is a <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 500;">parameter</span>—a placeholder that receives whatever data you pass in. When you call <code>calculate_average(test_scores)</code>, the <code>test_scores</code> list becomes available inside the function as <code>numbers</code>.</p>
</div>

## Function Components: Parameters, Return Values, and Defaults

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
  <div style="font-weight: 600; color: #334155; margin-bottom: 12px; font-size: 1.1em;">📦 Parameters (Input)</div>
  <p style="color: #64748b; margin: 0; line-height: 1.7;">The values you pass into a function so it can work with your specific data. A calculator needs numbers to add—it doesn't care <em>which</em> numbers, but it needs some numbers to work with.</p>
</div>

```python
def greet_student(name, grade_level):
    print(f"Welcome, {name}! You're in grade {grade_level}.")

greet_student("Alex", 10)  # name="Alex", grade_level=10
greet_student("Jordan", 11)  # name="Jordan", grade_level=11
```

**Output:**
```
Welcome, Alex! You're in grade 10.
Welcome, Jordan! You're in grade 11.
```

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
  <div style="font-weight: 600; color: #334155; margin-bottom: 12px; font-size: 1.1em;">📤 Return Values (Output)</div>
  <p style="color: #64748b; margin: 0; line-height: 1.7;">The result a function sends back to whoever called it. Without <code>return</code>, your function does work but doesn't give you anything back—imagine asking someone to calculate a tip and they just nod without telling you the amount.</p>
</div>

```python
def calculate_final_grade(test_avg, homework_avg):
    final = (test_avg * 0.7) + (homework_avg * 0.3)
    return final  # Send the result back

# Store the result and use it
my_final = calculate_final_grade(85, 92)
print(f"Your final grade: {my_final}")
```

**Output:**
```
Your final grade: 87.1
```

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
  <div style="font-weight: 600; color: #334155; margin-bottom: 12px; font-size: 1.1em;">⚙️ Default Arguments (Optional Settings)</div>
  <p style="color: #64748b; margin: 0; line-height: 1.7;">Sometimes you want a parameter to have a "usual" value that gets used if the caller doesn't specify something different. A coffee machine defaults to medium size unless you press the large button—default arguments work the same way.</p>
</div>

```python
def create_report(student_name, report_type="weekly"):
    print(f"Generating {report_type} report for {student_name}")

create_report("Sam")  # Uses default: "weekly"
create_report("Taylor", "monthly")  # Overrides default
```

**Output:**
```
Generating weekly report for Sam
Generating monthly report for Taylor
```

<div style="background-color: #fef7e6; border-left: 4px solid #f5a623; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #b8860b; margin-bottom: 8px;">⚠️ Parameter Order Matters</div>
  <p style="color: #92702b; margin: 0; line-height: 1.6;">Parameters with defaults must come <em>after</em> parameters without defaults. <code>def func(required, optional='default')</code> works, but <code>def func(optional='default', required)</code> causes a syntax error. Python needs to know which arguments go where when you call the function.</p>
</div>

## Variable Scope: Where Names Live and Die

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Here's where things get interesting—and where beginners often encounter mysterious bugs. Variables don't exist everywhere in your program; they have <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 500;">scope</span>, which is just a fancy way of saying "the region of code where this variable is visible."</p>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
  <div style="font-weight: 600; color: #334155; margin-bottom: 12px; font-size: 1.1em;">🏠 Local Scope (Inside Functions)</div>
  <p style="color: #64748b; margin: 0; line-height: 1.7;">Variables created inside a function only exist <em>inside</em> that function. Once the function finishes, those variables vanish. Notes you write on a whiteboard during a meeting work the same way—they're useful during the meeting but get erased when the meeting ends.</p>
</div>

```python
def calculate_bonus(sales):
    bonus_rate = 0.1  # Local variable—only exists in this function
    bonus = sales * bonus_rate
    return bonus

employee_bonus = calculate_bonus(5000)
print(employee_bonus)  # Works fine: 500.0

print(bonus_rate)  # ERROR! bonus_rate doesn't exist outside the function
```

**Output:**
```
500.0
NameError: name 'bonus_rate' is not defined
```

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
  <div style="font-weight: 600; color: #334155; margin-bottom: 12px; font-size: 1.1em;">🌍 Global Scope (Outside Functions)</div>
  <p style="color: #64748b; margin: 0; line-height: 1.7;">Variables created outside any function exist everywhere in your program. They're like public announcements—everyone can hear them. Functions can read global variables without any issues. However, if you assign a value to a variable name inside a function, Python assumes you want a new local variable—even if a global with that name exists. To modify a global variable, you must use the <code>global</code> keyword before assignment.</p>
</div>

```python
high_score = 100  # Global variable

def update_score(new_score):
    high_score = new_score  # Creates a NEW local variable!
    print(f"Inside function: {high_score}")

update_score(150)
print(f"Outside function: {high_score}")  # Still 100—unchanged!
```

**Output:**
```
Inside function: 150
Outside function: 100
```

<div style="background-color: #fef7e6; border-left: 4px solid #f5a623; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #b8860b; margin-bottom: 8px;">⚠️ The Scope Surprise</div>
  <p style="color: #92702b; margin: 0; line-height: 1.6;">This behavior trips up almost every beginner. You think you're modifying the global <code>high_score</code>, but Python sees the assignment and says, "Oh, you want a <em>local</em> variable called <code>high_score</code>!" To actually modify the global, you need to declare it with the <code>global</code> keyword.</p>
</div>

```python
high_score = 100

def update_score_correctly(new_score):
    global high_score  # "I want to modify the global variable"
    high_score = new_score
    print(f"Inside function: {high_score}")

update_score_correctly(150)
print(f"Outside function: {high_score}")  # Now it's 150!
```

**Output:**
```
Inside function: 150
Outside function: 150
```

## Combining 2D Arrays and Functions: Building Reusable Tools

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">The real power emerges when you combine these concepts. Imagine building a function that processes any 2D array of grades—no matter how many students or tests:</p>

```python
def get_class_average(grade_table):
    total_sum = 0
    total_count = 0
    
    for student_grades in grade_table:
        for grade in student_grades:
            total_sum += grade
            total_count += 1
    
    return total_sum / total_count

# Works with any size grade table
small_class = [
    [85, 90],
    [78, 82]
]

large_class = [
    [85, 92, 78, 90],
    [90, 88, 95, 87],
    [76, 81, 89, 84],
    [88, 91, 86, 89]
]

print(f"Small class average: {get_class_average(small_class)}")
print(f"Large class average: {get_class_average(large_class)}")
```

**Output:**
```
Small class average: 83.75
Large class average: 86.58333333333333
```

<div style="background-color: #ecfdf5; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
  <div style="font-weight: 600; color: #047857; margin-bottom: 16px;">✨ Why This Combination Is Powerful</div>
  <ul style="list-style: none; padding: 0; margin: 0;">
    <li style="padding: 10px 0 10px 28px; position: relative; color: #065f46; line-height: 1.6;"><span style="position: absolute; left: 0;">✓</span> <strong>Modularity</strong>: Write the logic once, use it with any compatible data structure</li>
    <li style="padding: 10px 0 10px 28px; position: relative; color: #065f46; line-height: 1.6;"><span style="position: absolute; left: 0;">✓</span> <strong>Testability</strong>: Easy to verify your function works correctly with small test cases before using it on real data</li>
    <li style="padding: 10px 0 10px 28px; position: relative; color: #065f46; line-height: 1.6;"><span style="position: absolute; left: 0;">✓</span> <strong>Maintainability</strong>: When requirements change, update the function in one place rather than hunting through scattered code</li>
  </ul>
</div>

## Arrays of Dictionaries: When Each Row Has Named Fields

<p style="margin: 16px 0; line-height: 1.8; color: #374151;">Sometimes you need more than just numbers in a grid. What if each student has a name, ID, and multiple test scores? You can create a list where each element is a dictionary:</p>

```python
students = [
    {"name": "Alex", "id": 101, "scores": [85, 92, 78]},
    {"name": "Jordan", "id": 102, "scores": [90, 88, 95]},
    {"name": "Taylor", "id": 103, "scores": [76, 81, 89]}
]

# Access specific student's data
print(f"{students[0]['name']}'s first test: {students[0]['scores'][0]}")

# Calculate each student's average
for student in students:
    avg = sum(student['scores']) / len(student['scores'])
    print(f"{student['name']} (ID: {student['id']}): {avg:.1f}")
```

**Output:**
```
Alex's first test: 85
Alex (ID: 101): 85.0
Jordan (ID: 102): 91.0
Taylor (ID: 103): 82.0
```

<div style="background-color: #e0f2fe; border-left: 4px solid #0ea5e9; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #0284c7; margin-bottom: 8px;">💡 Quick Insight</div>
  <p style="color: #0369a1; margin: 0; line-height: 1.6;">This pattern—a list of dictionaries—appears constantly in real-world programming. JSON data from web APIs, database query results, and configuration files all use this structure.</p>
</div>

## Thinking Ahead

<details style="margin: 20px 0; border: 1px solid #e9d5ff; border-radius: 8px; overflow: hidden; background: #faf5ff;">
  <summary style="padding: 16px 20px; cursor: pointer; font-weight: 600; color: #7c3aed;">🤔 Think about it: What happens to local variables?</summary>
  <div style="padding: 16px 20px; background: #ffffff; border-top: 1px solid #e9d5ff; color: #6b21a8; line-height: 1.7;">
    If you call the same function five times, and each time it creates a local variable called <code>result</code>, do you end up with five different <code>result</code> variables floating around in memory? Or does something else happen? Consider what would happen to your computer's memory if every function call left permanent variables behind...
  </div>
</details>

<div style="background-color: #fef7e6; border-left: 4px solid #f5a623; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #b8860b; margin-bottom: 8px;">❓ Question to Ponder</div>
  <p style="color: #92702b; margin: 0; line-height: 1.6;">You're building a game with a 10×10 grid. A player can move in four directions. How would you write a function that checks if a move is valid (not off the edge of the board)? What parameters would it need? What would it return?</p>
</div>

<div style="background-color: #f3e8ff; border-left: 4px solid #a855f7; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <div style="font-weight: 600; color: #7c3aed; margin-bottom: 8px;">🔮 Sneak Preview</div>
  <p style="color: #6d28d9; margin: 0; line-height: 1.6;">In the upcoming lecture, you'll discover a common bug that even experienced programmers hit: accidentally modifying a 2D array when you meant to create a copy. The culprit? How Python handles <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 500;">mutable</span> data structures. Understanding this will save you hours of debugging frustration.</p>
</div>
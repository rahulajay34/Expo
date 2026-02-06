# Assignment: Database Fundamentals and SQL

## Learning Objectives

By completing this assignment, you will:

* Understand the role and properties of Primary and Candidate Keys.
* Analyze the enforcement of Referential Integrity using Foreign Keys.
* Differentiate between various SQL constraints (UNIQUE, NOT NULL, CHECK).
* Apply SQL Data Definition Language (DDL) to create tables with complex constraints.

---

## Section 1: Objective Questions (Multiple Choice)

### Easy Questions (Knowledge-Based Understanding)

**Question 1: Multiple Choice**

If a table has multiple candidate keys, which one becomes the primary key? 

A. The longest candidate key 
B. The key with foreign references 
C. One chosen by the designer 
D. All candidate keys 

**Correct Answer:** C 

**Explanation:** A table may have multiple columns (or combinations of columns) that can uniquely identify a row; these are called candidate keys. The database designer selects one of these candidate keys to be the Primary Key based on design requirements (e.g., simplicity, stability).

---

**Question 2: Multiple Choice**

How many primary keys can a table have? 

A. Zero 
B. One 
C. Two 
D. Unlimited 

**Correct Answer:** B 

**Explanation:** By definition, a relational database table can have only **one** Primary Key constraint, although that primary key may consist of multiple columns (a composite key).

---

**Question 3: Multiple Choice**

Which property is NOT allowed in a primary key column? 

A. UNIQUE 
B. NOT NULL 
C. NULL values 
D. Indexing 

**Correct Answer:** C 

**Explanation:** The Primary Key serves as the unique identifier for a row. If a value were NULL, it would imply that the entity is unidentified, which violates the integrity rule of the Primary Key. Therefore, it must be UNIQUE and NOT NULL.

---

**Question 4: Multiple Choice**

Which SQL clause enforces referential integrity? 

A. PRIMARY KEY 
B. UNIQUE 
C. CHECK 
D. FOREIGN KEY 

**Correct Answer:** D 

**Explanation:** Referential integrity ensures that relationships between tables remain consistent. The FOREIGN KEY constraint enforces this by ensuring that a value in one table corresponds to an existing valid value in another referenced table.

---

**Question 5: Multiple Choice**

Which statement is TRUE about foreign keys? 

A. They must reference a unique or primary key 
B. They cannot allow NULL values 
C. They always enforce cascading deletes 
D. They must be indexed 

**Correct Answer:** A 

**Explanation:** A Foreign Key must map to a column in the parent table that creates a unique identification (either a Primary Key or a UNIQUE constraint) to ensure the reference is unambiguous.

---

**Question 6: Multiple Choice**

Which constraint allows NULL values but no duplicates? 

A. PRIMARY KEY 
B. UNIQUE 
C. FOREIGN KEY 
D. NOT NULL 

**Correct Answer:** B 

**Explanation:** The UNIQUE constraint ensures all values in a column are distinct. However, unlike the Primary Key, most SQL dialects allow multiple NULL values (or at least one, depending on the specific database engine) because NULL is not considered equal to another NULL.

---

**Question 7: Multiple Choice**

Which constraint validates a condition on column values? 

A. UNIQUE 
B. CHECK 
C. FOREIGN KEY 
D. DEFAULT 

**Correct Answer:** B 

**Explanation:** The CHECK constraint allows you to specify a Boolean condition (e.g., `age > 18` or `price > 0`) that every row must satisfy to be valid.

---

### Moderate Questions (Implementation & Application)

**Question 8: Multiple Choice**

Consider the following table definition:

```sql
CREATE TABLE orders (
  order_id INT,
  user_id INT,
  PRIMARY KEY (order_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

```



Which statement is TRUE regarding the `user_id` column? 

A. user_id must be unique 
B. user_id cannot be NULL 
C. user_id can repeat 
D. users.id must allow NULL 

**Correct Answer:** C 

**Explanation:** This creates a one-to-many relationship. One user (from the `users` table) can place multiple orders. Therefore, the `user_id` in the `orders` table acts as a foreign key and can appear multiple times (repeat) for different orders belonging to the same user.

---

## Section 2: Subjective Question (Synthesis & Analysis)

**Question 9: Application & Synthesis**

**Scenario:** You are designing a database for an **E-commerce Order Management System**. 

**Your Task:** Create a table named `orders` with the following requirements:

1. Each order must have a unique order ID. 


2. Every order must be associated with a user. 


3. An order should store the total amount, which must always be greater than 0. 


4. The order status should be limited to the values: CREATED, PAID, SHIPPED, CANCELLED. 


5. The order creation time should be stored and must always have a value. 


6. If a user is deleted, all their orders should also be deleted automatically. 



**Deliverable:** Write the SQL query to create the table with appropriate constraints, and explain each constraint used. 

---

**Sample Editorial Solution:**

**SQL Query:**

```sql
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount > 0),
    order_status VARCHAR(20) NOT NULL
         CHECK (order_status IN ('CREATED', 'PAID', 'SHIPPED', 'CANCELLED')),
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

```



**Explanation of Constraints:**

1. **`PRIMARY KEY (order_id)`**: Ensures the `order_id` is unique and not null, serving as the identifier for the order.
2. **`NOT NULL` on `user_id**`: Ensures every order is associated with a user (cannot be orphan).
3. **`CHECK (total_amount > 0)`**: Validates that the order amount is positive logic.
4. **`CHECK (order_status IN (...))`**: Restricts the status to the specific allowed values (Enums).
5. **`NOT NULL` on `created_at**`: Ensures the timestamp is always recorded.
6. **`ON DELETE CASCADE`**: Enforces referential integrity such that if a user is removed from the `users` table, the database automatically removes their corresponding orders to prevent orphan records.

---

## Answer Key and Solutions

### Objective Questions Answer Summary

| Question | Type | Answer | Difficulty |
| --- | --- | --- | --- |
| 1 | MCQ | C | Easy |
| 2 | MCQ | B | Easy |
| 3 | MCQ | C | Easy |
| 4 | MCQ | D | Easy |
| 5 | MCQ | A | Moderate |
| 6 | MCQ | B | Moderate |
| 7 | MCQ | B | Moderate |
| 8 | MCQ | C | Moderate |

---

### Subjective Question Evaluation Rubric

**Question 9 – E-commerce Table Creation**

**Scoring Criteria (out of 100 points):**

| Criterion | Points | Evaluation Notes |
| --- | --- | --- |
| **Primary Key Definition** | 15 | Correctly identifies `order_id` as the Primary Key. |
| **Foreign Key & Cascade** | 25 | Correctly sets `user_id` as a Foreign Key to `users(id)` and implements `ON DELETE CASCADE`. |
| **Data Validation (CHECK)** | 25 | Implements valid `CHECK` constraints for both `total_amount > 0` and the `order_status` allowed values list. |
| **Null Handling** | 20 | Correctly applies `NOT NULL` to `user_id`, `total_amount`, and `created_at`. |
| **Syntax & Data Types** | 15 | SQL syntax is valid; data types (DECIMAL, TIMESTAMP, VARCHAR) are appropriate for the data described. |
-- Add instructor_quality column to generations table
-- This stores the teaching quality analysis results from the InstructorQualityAgent

ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS instructor_quality JSONB DEFAULT NULL;

COMMENT ON COLUMN generations.instructor_quality IS 'Stores instructor teaching quality evaluation results including overall score, strengths, and improvement areas';

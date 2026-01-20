/**
 * Project Alpine - Database Seed Script
 *
 * Populates the database with sample data for development/testing.
 * Run with: npm run db:seed
 */

require('dotenv').config();

const { initializeDatabase } = require('./database');
const { Task, Category, Tag } = require('../models');

// Sample categories
const sampleCategories = [
  { name: 'General', color: '#718096', isDefault: true },
  { name: 'School', color: '#4299E1', isDefault: false },
  { name: 'Sports', color: '#48BB78', isDefault: false },
  { name: 'Personal', color: '#9F7AEA', isDefault: false },
];

// Sample tags
const sampleTags = [
  { name: 'Homework', color: '#E53E3E' },
  { name: 'Exam', color: '#DD6B20' },
  { name: 'Practice', color: '#38A169' },
  { name: 'Game', color: '#3182CE' },
  { name: 'Project', color: '#805AD5' },
  { name: 'Reading', color: '#D69E2E' },
  { name: 'Meeting', color: '#00B5D8' },
  { name: 'Deadline', color: '#E53E3E' },
];

// Sample tasks
const sampleTasks = [
  {
    title: 'Complete Math Assignment',
    description: 'Chapter 5 exercises, problems 1-20',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    urgency: 'high',
    status: 'pending',
    category: 'School',
    tags: ['Homework', 'Deadline'],
  },
  {
    title: 'Basketball Practice',
    description: 'Team practice at the gym',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
    urgency: 'medium',
    status: 'pending',
    category: 'Sports',
    tags: ['Practice'],
  },
  {
    title: 'Read Biology Chapter 7',
    description: 'Cellular respiration and photosynthesis',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    urgency: 'low',
    status: 'pending',
    category: 'School',
    tags: ['Reading'],
  },
  {
    title: 'Study for Physics Exam',
    description: 'Review chapters 3-6, focus on momentum and energy',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    urgency: 'critical',
    status: 'in_progress',
    category: 'School',
    tags: ['Exam', 'Deadline'],
  },
  {
    title: 'Soccer Game vs Lincoln High',
    description: 'Away game, bus leaves at 3pm',
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    urgency: 'high',
    status: 'pending',
    category: 'Sports',
    tags: ['Game'],
  },
  {
    title: 'Group Project Meeting',
    description: 'Meet with team to discuss presentation outline',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
    urgency: 'medium',
    status: 'pending',
    category: 'School',
    tags: ['Project', 'Meeting'],
  },
  {
    title: 'Gym workout',
    description: 'Strength training - legs day',
    dueDate: new Date(),
    urgency: 'low',
    status: 'pending',
    category: 'Personal',
    tags: ['Practice'],
  },
  {
    title: 'Submit English Essay',
    description: 'Final draft of persuasive essay, 1500 words',
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
    urgency: 'critical',
    status: 'completed',
    category: 'School',
    tags: ['Homework', 'Deadline'],
  },
];

async function seed() {
  console.log('Starting database seed...\n');

  try {
    // Initialize database
    await initializeDatabase();

    // Clear existing data
    console.log('Clearing existing data...');
    await Task.destroy({ where: {}, truncate: true, cascade: true });
    await Tag.destroy({ where: {}, truncate: true, cascade: true });
    await Category.destroy({ where: {}, truncate: true, cascade: true });

    // Create categories
    console.log('Creating categories...');
    const categories = {};
    for (const cat of sampleCategories) {
      const created = await Category.create(cat);
      categories[cat.name] = created;
      console.log(`  Created category: ${cat.name}`);
    }

    // Create tags
    console.log('\nCreating tags...');
    const tags = {};
    for (const tag of sampleTags) {
      const created = await Tag.create(tag);
      tags[tag.name] = created;
      console.log(`  Created tag: ${tag.name}`);
    }

    // Create tasks
    console.log('\nCreating tasks...');
    for (const taskData of sampleTasks) {
      const { category, tags: tagNames, ...taskFields } = taskData;

      // Create task with category
      const task = await Task.create({
        ...taskFields,
        categoryId: categories[category]?.id || null,
      });

      // Associate tags
      if (tagNames && tagNames.length > 0) {
        const taskTags = tagNames.map((name) => tags[name]).filter(Boolean);
        await task.setTags(taskTags);
      }

      console.log(`  Created task: ${task.title}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log(`   - ${sampleCategories.length} categories`);
    console.log(`   - ${sampleTags.length} tags`);
    console.log(`   - ${sampleTasks.length} tasks`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();

#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

program
  .version('0.0.1')
  .description('A simple CLI for creating a new project')
  .option('-n, --name <name>', 'Project name')
  .option('-d, --directory <directory>', 'Project directory')
  .option('-f, --force', 'Overwrite existing files')
  .parse(process.argv);

const projectName = program.name || 'my-app';
const projectDirectory = program.directory || projectName;
const projectPath = path.join(process.cwd(), projectDirectory);

if (fs.existsSync(projectPath) && !program.force) {
  console.error(`Project directory ${projectDirectory} already exists!`);
  process.exit(1);
}

inquirer
  .prompt([
    {
      type: 'list',
      name: 'language',
      message: 'Select a programming language:',
      choices: ['JavaScript', 'TypeScript'],
    },
    {
      type: 'confirm',
      name: 'useLinter',
      message: 'Would you like to use a linter?',
      default: true,
    },
  ])
  .then((answers) => {
    console.log('Creating project...');
    console.log(`Project name: ${projectName}`);
    console.log(`Project directory: ${projectDirectory}`);
    console.log(`Programming language: ${answers.language}`);
    console.log(`Use a linter: ${answers.useLinter}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

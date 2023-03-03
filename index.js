#!/usr/bin/env node

import dotenv from 'dotenv';
import axios from 'axios';
import { program } from 'commander';
import prompts from 'prompts';
import ora from 'ora';

// import path from path;
// import fs from fs;
// import util from util;
// import { ChildProcess } from 'child_process';
// const exec = util.promisify(ChildProcess.exec);

dotenv.config();

const service = axios.create({
  baseURL: `${process.env.BASE_PATH}/${process.env.REPOS}/contents/`,
  timeout: 30000,
});

const spinner = ora();

const loadTemplates = async () => {
  spinner.start('正在加载模板列表...');
  try {
    const { data: templates } = await service.get(process.env.ROOT);
    spinner.stop();
    return templates;
  } catch (error) {
    spinner.stop();
    const { retry } = await prompts({
      type: 'confirm',
      name: 'retry',
      message: '加载模板列表失败，是否重试？',
      initial: true,
    });
    if (retry) {
      return loadTemplates();
    }
    process.exit();
  }
};

program.version(process.env.VERSION);

program
  .command(process.env.COMMAND)
  .description('Create a new app')
  .action(async () => {
    const { projectName } = await prompts({
      type: 'text',
      name: 'projectName',
      message: '请输入项目名称：',
      initial: 'my-app',
      validate: name => {
        if (name === '') {
          return '项目名称不可为空';
        }
        return true;
      },
    });

    const templates = await loadTemplates();

    const templateNames = templates
      .filter(template => template.type === 'dir')
      .map(template => template.name);

    const { selectedTemplateName } = await prompts({
      type: 'select',
      name: 'selectedTemplateName',
      message: '请选择模板：',
      choices: templateNames,
    });

    // const appPath = path.join(process.cwd(), name);
    // fs.mkdirSync(appPath);
    // process.chdir(appPath);

    // console.log(`Downloading ${selectedTemplateName} template...`);

    // await exec(`npx degit ${depot}/${root}/${selectedTemplateName}#${selectedFileNames.join(',')} .`, { stdio: 'inherit' });

    // console.log('Installing dependencies...');
    // await exec('npm install', { stdio: 'inherit' });

    // console.log('Done!');
  });

program.parse(process.argv);

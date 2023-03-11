import dotenv from 'dotenv';
import axios from 'axios';
import { program } from 'commander';
import prompts from 'prompts';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import validate from 'validate-npm-package-name';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(__dirname, './.env'),
});

const service = axios.create({
  baseURL: `${process.env.BASE_PATH}/${process.env.REPOS}/contents/`,
  timeout: 30000,
});

const spinner = ora();

/************************************************
 * ✨初始化
 ************************************************/

async function init() {
  const packageJSON = JSON.parse(
    await readFile(new URL('./package.json', import.meta.url))
  );
  program
    .version(packageJSON.version)
    .argument('<app-dir>', '应用路径（名称）')
    .action(async appDir => {
      const templates = await loadTemplates();

      const templateNames = templates
        .filter(template => template.type === 'dir')
        .map(template => template.name);

      const { selectedTemplateIndex } = await prompts({
        type: 'select',
        name: 'selectedTemplateIndex',
        message: '请选择模板：',
        choices: templateNames,
      });

      await createApp(appDir, templates[selectedTemplateIndex]);
    })
    .parse(process.argv);
}

/************************************************
 * ✨加载模板列表
 ************************************************/

async function loadTemplates() {
  spinner.start('正在加载模板列表...');
  try {
    const { data: templates } = await service.get(process.env.ROOT);
    spinner.succeed('加载模板列表成功！');
    return templates;
  } catch (error) {
    spinner.fail(error.message);
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
}

/************************************************
 * ✨创建应用
 ************************************************/

async function createApp(name, template) {
  // 将路径转换成绝对路径，提取绝对路径的最后一部分作为应用名称
  const root = path.resolve(name);
  const appName = path.basename(root);
  checkAppName(appName);

  // 下载模板文件
  spinner.start(`正在下载 ${template.name} 模板...`);
  const { data } = await service.get(
    `${process.env.ROOT}/${template.name}/index.zip?ref=master`
  );
  const templateContent = Buffer.from(data.content, 'base64');
  fs.writeFileSync('index.zip', templateContent);
  spinner.succeed(`下载模板文件成功！`);

  // 解压缩zip文件
  spinner.start(`正在解压 ${template.name} 模板...`);
  const zip = new AdmZip('index.zip');
  zip.extractAllTo(root, true);
  spinner.succeed(`解压模板文件成功！`);

  // 修改package.json的name属性
  const packagePath = path.join(root, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  packageJson.name = appName;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

  spinner.succeed(`创建 ${name} 应用成功！`);
}

/************************************************
 * ✨检查应用名称
 ************************************************/

function checkAppName(name) {
  // 校验应用名称是否符合 npm 标准
  const validationResult = validate(name);
  if (!validationResult.validForNewPackages) {
    console.error(
      chalk.red(
        `不能创建名为 ${chalk.green(
          `"${name}"`
        )} 的应用，因为 npm 的命名限制：\n`
      )
    );
    [
      ...(validationResult.errors || []),
      ...(validationResult.warnings || []),
    ].forEach(error => {
      console.error(chalk.red(`  * ${error}`));
    });
    console.error(chalk.red('\n请选择其他的应用名称。'));
    process.exit(1);
  }
  // 校验应用名称是否和依赖重复
  const dependencies = ['react', 'react-dom', 'react-scripts'].sort();
  if (dependencies.includes(name)) {
    console.error(
      chalk.red(
        `不能创建名为 ${chalk.green(
          `"${name}"`
        )} 的应用，因为存在一个依赖和它具有相同的名称。\n` +
          `由于 npm 的工作原理，这些名称是不允许的：\n\n`
      ) +
        chalk.cyan(dependencies.map(depName => `  ${depName}`).join('\n')) +
        chalk.red('\n\n请选择其他的应用名称')
    );
    process.exit(1);
  }
}

export { init };

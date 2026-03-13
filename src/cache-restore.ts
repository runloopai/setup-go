import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as glob from '@actions/glob';
import path from 'path';
import fs from 'fs';

import {State, Outputs} from './constants';
import {PackageManagerInfo} from './package-managers';
import {
  getModuleCacheDirectoryPath,
  getBuildCacheDirectoryPath,
  getPackageManagerInfo
} from './cache-utils';

export const restoreCache = async (
  versionSpec: string,
  packageManager: string,
  cacheDependencyPath?: string
) => {
  const packageManagerInfo = await getPackageManagerInfo(packageManager);
  const platform = process.env.RUNNER_OS;

  const moduleCachePath = await getModuleCacheDirectoryPath(packageManagerInfo);

  const dependencyFilePath = cacheDependencyPath
    ? cacheDependencyPath
    : findDependencyFile(packageManagerInfo);
  const fileHash = await glob.hashFiles(dependencyFilePath);

  if (!fileHash) {
    throw new Error(
      'Some specified paths were not resolved, unable to cache dependencies.'
    );
  }

  const linuxVersion =
    process.env.RUNNER_OS === 'Linux' ? `${process.env.ImageOS}-` : '';
  const primaryKey = `setup-go-${platform}-${linuxVersion}go-${versionSpec}-${fileHash}`;
  core.debug(`module cache primary key is ${primaryKey}`);

  core.saveState(State.CachePrimaryKey, primaryKey);

  const cacheKey = await cache.restoreCache([moduleCachePath], primaryKey);
  core.setOutput(Outputs.CacheHit, Boolean(cacheKey));

  if (!cacheKey) {
    core.info(`Module cache is not found`);
    core.setOutput(Outputs.CacheHit, false);
    return;
  }

  core.saveState(State.CacheMatchedKey, cacheKey);
  core.info(`Module cache restored from key: ${cacheKey}`);
};

// Normalize GitHub runner OS to Go OS values
const normalizeOs = (os: string): string => {
  const osMap: { [key: string]: string } = {
    Linux: 'linux',
    Windows: 'windows',
    macOS: 'darwin'
  };
  return osMap[os] || os.toLowerCase();
};

// Normalize GitHub runner arch to Go arch values
const normalizeArch = (arch: string): string => {
  const archMap: { [key: string]: string } = {
    ia32: '386',
    x64: 'amd64',
    arm: 'arm',
    arm64: 'arm64'
  };
  return archMap[arch] || arch;
};

export const restoreBuildCache = async (
  versionSpec: string,
  packageManager: string,
  buildCacheDependencyPath?: string,
  targetOsInput?: string,
  targetArchInput?: string,
  targetAmd64?: string,
  targetArm64?: string,
  cgo: boolean = true
) => {
  const packageManagerInfo = await getPackageManagerInfo(packageManager);

  // Use input if provided, otherwise normalize runner values
  const targetOs = targetOsInput || normalizeOs(process.env.RUNNER_OS || '');
  const targetArch = targetArchInput || normalizeArch(process.arch);

  // Get microarchitecture level for amd64/arm64
  let microArch = '';
  if (targetArch === 'amd64' && targetAmd64) {
    microArch = `-${targetAmd64}`;
  } else if (targetArch === 'arm64' && targetArm64) {
    microArch = `-${targetArm64}`;
  }

  // CGO suffix for cache key
  const cgoSuffix = cgo ? '' : '-nocgo';

  const buildCachePath = await getBuildCacheDirectoryPath(packageManagerInfo);

  const dependencyFilePath = buildCacheDependencyPath
    ? buildCacheDependencyPath
    : findDependencyFile(packageManagerInfo);
  const fileHash = await glob.hashFiles(dependencyFilePath);

  if (!fileHash) {
    throw new Error(
      'Some specified paths were not resolved, unable to cache build artifacts.'
    );
  }

  const linuxVersion =
    process.env.RUNNER_OS === 'Linux' ? `${process.env.ImageOS}-` : '';
  const primaryKey = `setup-go-${targetOs}-${targetArch}${microArch}${cgoSuffix}-${linuxVersion}go-${versionSpec}-build-${fileHash}`;
  core.debug(`build cache primary key is ${primaryKey}`);

  core.saveState(State.BuildCachePrimaryKey, primaryKey);

  const cacheKey = await cache.restoreCache([buildCachePath], primaryKey);
  core.setOutput(Outputs.BuildCacheHit, Boolean(cacheKey));

  if (!cacheKey) {
    core.info(`Build cache is not found`);
    core.setOutput(Outputs.BuildCacheHit, false);
    return;
  }

  core.saveState(State.BuildCacheMatchedKey, cacheKey);
  core.info(`Build cache restored from key: ${cacheKey}`);
};

const findDependencyFile = (packageManager: PackageManagerInfo) => {
  const dependencyFile = packageManager.dependencyFilePattern;
  const workspace = process.env.GITHUB_WORKSPACE!;
  const rootContent = fs.readdirSync(workspace);

  const goModFileExists = rootContent.includes(dependencyFile);
  if (!goModFileExists) {
    throw new Error(
      `Dependencies file is not found in ${workspace}. Supported file pattern: ${dependencyFile}`
    );
  }

  return path.join(workspace, dependencyFile);
};

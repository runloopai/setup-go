import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as glob from '@actions/glob';
import fs from 'fs';

import * as cacheRestore from '../src/cache-restore';
import * as cacheUtils from '../src/cache-utils';
import {PackageManagerInfo} from '../src/package-managers';

describe('restoreCache', () => {
  let hashFilesSpy: jest.SpyInstance;
  let getModuleCacheDirectoryPathSpy: jest.SpyInstance;
  let restoreCacheSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let setOutputSpy: jest.SpyInstance;

  const versionSpec = '1.13.1';
  const packageManager = 'default';
  const cacheDependencyPath = 'path';

  let originalWorkspace: string | undefined;

  beforeEach(() => {
    originalWorkspace = process.env.GITHUB_WORKSPACE;
    process.env.GITHUB_WORKSPACE = '/test/workspace';
    //Arrange
    hashFilesSpy = jest.spyOn(glob, 'hashFiles');
    getModuleCacheDirectoryPathSpy = jest.spyOn(
      cacheUtils,
      'getModuleCacheDirectoryPath'
    );
    restoreCacheSpy = jest.spyOn(cache, 'restoreCache');
    infoSpy = jest.spyOn(core, 'info');
    setOutputSpy = jest.spyOn(core, 'setOutput');

    getModuleCacheDirectoryPathSpy.mockImplementation(
      (PackageManager: PackageManagerInfo) => {
        return Promise.resolve('module_cache_directory_path');
      }
    );
  });

  afterEach(() => {
    process.env.GITHUB_WORKSPACE = originalWorkspace;
    jest.restoreAllMocks();
  });

  it('should throw if dependency file path is not valid', async () => {
    // Arrange
    hashFilesSpy.mockImplementation(() => Promise.resolve(''));
    // Act + Assert
    await expect(
      cacheRestore.restoreCache(
        versionSpec,
        packageManager,
        cacheDependencyPath
      )
    ).rejects.toThrow(
      'Some specified paths were not resolved, unable to cache dependencies.'
    );
  });

  it('should inform if cache hit is not occurred', async () => {
    // Arrange
    hashFilesSpy.mockImplementation(() => Promise.resolve('file_hash'));
    restoreCacheSpy.mockImplementation(() => Promise.resolve(''));
    // Act + Assert
    await cacheRestore.restoreCache(
      versionSpec,
      packageManager,
      cacheDependencyPath
    );
    expect(infoSpy).toHaveBeenCalledWith('Module cache is not found');
  });

  it('should set output if cache hit is occurred', async () => {
    // Arrange
    hashFilesSpy.mockImplementation(() => Promise.resolve('file_hash'));
    restoreCacheSpy.mockImplementation(() => Promise.resolve('cache_key'));
    // Act + Assert
    await cacheRestore.restoreCache(
      versionSpec,
      packageManager,
      cacheDependencyPath
    );
    expect(setOutputSpy).toHaveBeenCalledWith('cache-hit', true);
  });

  it('should throw if dependency file is not found in workspace', async () => {
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['main.go'] as any);

    await expect(
      cacheRestore.restoreCache(
        versionSpec,
        packageManager
        // No cacheDependencyPath
      )
    ).rejects.toThrow(
      'Dependencies file is not found in /test/workspace. Supported file pattern: go.mod'
    );
  });
});

describe('restoreBuildCache', () => {
  let hashFilesSpy: jest.SpyInstance;
  let getBuildCacheDirectoryPathSpy: jest.SpyInstance;
  let restoreCacheSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let setOutputSpy: jest.SpyInstance;

  const versionSpec = '1.13.1';
  const packageManager = 'default';
  const cacheDependencyPath = 'path';

  let originalWorkspace: string | undefined;

  beforeEach(() => {
    originalWorkspace = process.env.GITHUB_WORKSPACE;
    process.env.GITHUB_WORKSPACE = '/test/workspace';
    //Arrange
    hashFilesSpy = jest.spyOn(glob, 'hashFiles');
    getBuildCacheDirectoryPathSpy = jest.spyOn(
      cacheUtils,
      'getBuildCacheDirectoryPath'
    );
    restoreCacheSpy = jest.spyOn(cache, 'restoreCache');
    infoSpy = jest.spyOn(core, 'info');
    setOutputSpy = jest.spyOn(core, 'setOutput');

    getBuildCacheDirectoryPathSpy.mockImplementation(
      (PackageManager: PackageManagerInfo) => {
        return Promise.resolve('build_cache_directory_path');
      }
    );
  });

  afterEach(() => {
    process.env.GITHUB_WORKSPACE = originalWorkspace;
    jest.restoreAllMocks();
  });

  it('should throw if dependency file path is not valid', async () => {
    // Arrange
    hashFilesSpy.mockImplementation(() => Promise.resolve(''));
    // Act + Assert
    await expect(
      cacheRestore.restoreBuildCache(
        versionSpec,
        packageManager,
        cacheDependencyPath
      )
    ).rejects.toThrow(
      'Some specified paths were not resolved, unable to cache build artifacts.'
    );
  });

  it('should inform if build cache hit is not occurred', async () => {
    // Arrange
    hashFilesSpy.mockImplementation(() => Promise.resolve('file_hash'));
    restoreCacheSpy.mockImplementation(() => Promise.resolve(''));
    // Act + Assert
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath
    );
    expect(infoSpy).toHaveBeenCalledWith('Build cache is not found');
  });

  it('should set output if build cache hit is occurred', async () => {
    // Arrange
    hashFilesSpy.mockImplementation(() => Promise.resolve('file_hash'));
    restoreCacheSpy.mockImplementation(() => Promise.resolve('cache_key'));
    // Act + Assert
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath
    );
    expect(setOutputSpy).toHaveBeenCalledWith('build-cache-hit', true);
  });

  it('should throw if dependency file is not found in workspace', async () => {
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['main.go'] as any);

    await expect(
      cacheRestore.restoreBuildCache(
        versionSpec,
        packageManager
        // No cacheDependencyPath
      )
    ).rejects.toThrow(
      'Dependencies file is not found in /test/workspace. Supported file pattern: go.mod'
    );
  });
});

describe('restoreBuildCache key composition', () => {
  let hashFilesSpy: jest.SpyInstance;
  let getBuildCacheDirectoryPathSpy: jest.SpyInstance;
  let restoreCacheSpy: jest.SpyInstance;
  let saveStateSpy: jest.SpyInstance;

  const versionSpec = '1.21.0';
  const packageManager = 'default';
  const cacheDependencyPath = 'path';

  let originalWorkspace: string | undefined;
  let originalRunnerOs: string | undefined;
  let originalImageOs: string | undefined;

  beforeEach(() => {
    originalWorkspace = process.env.GITHUB_WORKSPACE;
    originalRunnerOs = process.env.RUNNER_OS;
    originalImageOs = process.env.ImageOS;
    process.env.GITHUB_WORKSPACE = '/test/workspace';
    process.env.RUNNER_OS = 'Linux';
    process.env.ImageOS = 'ubuntu24';

    hashFilesSpy = jest.spyOn(glob, 'hashFiles');
    getBuildCacheDirectoryPathSpy = jest.spyOn(
      cacheUtils,
      'getBuildCacheDirectoryPath'
    );
    restoreCacheSpy = jest.spyOn(cache, 'restoreCache');
    saveStateSpy = jest.spyOn(core, 'saveState');

    hashFilesSpy.mockImplementation(() => Promise.resolve('file_hash'));
    getBuildCacheDirectoryPathSpy.mockImplementation(() =>
      Promise.resolve('build_cache_directory_path')
    );
    restoreCacheSpy.mockImplementation(() => Promise.resolve(''));
  });

  afterEach(() => {
    process.env.GITHUB_WORKSPACE = originalWorkspace;
    process.env.RUNNER_OS = originalRunnerOs;
    process.env.ImageOS = originalImageOs;
    jest.restoreAllMocks();
  });

  const getBuildCacheKey = (): string =>
    saveStateSpy.mock.calls.find(([k]) => k === 'BUILD_CACHE_KEY')?.[1] ?? '';

  it('prefers explicit targetOs over RUNNER_OS', async () => {
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath,
      'darwin'
    );
    const key = getBuildCacheKey();
    expect(key).toContain('darwin');
    expect(key).not.toContain('Linux');
  });

  it('prefers explicit targetArchitecture over process.arch', async () => {
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath,
      undefined,
      'arm64'
    );
    expect(getBuildCacheKey()).toContain('-arm64');
  });

  it('includes amd64 microarch suffix when targetArch is amd64', async () => {
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath,
      undefined,
      'amd64',
      'v3'
    );
    expect(getBuildCacheKey()).toContain('-amd64-v3-');
  });

  it('includes arm64 microarch suffix when targetArch is arm64', async () => {
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath,
      undefined,
      'arm64',
      undefined,
      'v8.1'
    );
    expect(getBuildCacheKey()).toContain('-arm64-v8.1-');
  });

  it('ignores amd64 microarch when targetArch is arm64', async () => {
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath,
      undefined,
      'arm64',
      'v3', // targetAmd64 — should be ignored
      undefined
    );
    const key = getBuildCacheKey();
    expect(key).not.toContain('-v3');
    expect(key).toContain('-arm64-');
  });

  it('ignores arm64 microarch when targetArch is amd64', async () => {
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath,
      undefined,
      'amd64',
      undefined,
      'v8.1' // targetArm64 — should be ignored
    );
    const key = getBuildCacheKey();
    expect(key).not.toContain('-v8.1');
    expect(key).toContain('-amd64-');
  });

  it('adds -nocgo suffix when cgo is false', async () => {
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath,
      undefined,
      undefined,
      undefined,
      undefined,
      false
    );
    expect(getBuildCacheKey()).toContain('-nocgo-');
  });

  it('omits cgo suffix when cgo is true', async () => {
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );
    expect(getBuildCacheKey()).not.toContain('nocgo');
  });

  it('includes linux ImageOS in key on Linux runner', async () => {
    process.env.RUNNER_OS = 'Linux';
    process.env.ImageOS = 'ubuntu24';
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath,
      'linux'
    );
    expect(getBuildCacheKey()).toContain('ubuntu24-');
  });

  it('omits ImageOS in key for non-Linux runner', async () => {
    process.env.RUNNER_OS = 'macOS';
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath,
      'darwin'
    );
    expect(getBuildCacheKey()).not.toContain('ubuntu24-');
  });

  it('normalizes unknown RUNNER_OS via toLowerCase fallback', async () => {
    process.env.RUNNER_OS = 'FreeBSD';
    await cacheRestore.restoreBuildCache(
      versionSpec,
      packageManager,
      cacheDependencyPath
    );
    expect(getBuildCacheKey()).toContain('freebsd');
  });
});

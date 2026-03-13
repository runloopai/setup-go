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

import * as exec from '@actions/exec';
import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as cacheUtils from '../src/cache-utils';
import {PackageManagerInfo} from '../src/package-managers';

describe('getCommandOutput', () => {
  //Arrange
  const getExecOutputSpy = jest.spyOn(exec, 'getExecOutput');

  it('should return trimmed stdout in case of successful exit code', async () => {
    //Arrange
    const stdoutResult = ' stdout ';
    const trimmedStdout = stdoutResult.trim();

    getExecOutputSpy.mockImplementation((commandLine: string) => {
      return new Promise<exec.ExecOutput>(resolve => {
        resolve({exitCode: 0, stdout: stdoutResult, stderr: ''});
      });
    });

    //Act + Assert
    return cacheUtils
      .getCommandOutput('command')
      .then(data => expect(data).toBe(trimmedStdout));
  });

  it('should return error in case of unsuccessful exit code', async () => {
    //Arrange
    const stderrResult = 'error message';

    getExecOutputSpy.mockImplementation((commandLine: string) => {
      return new Promise<exec.ExecOutput>(resolve => {
        resolve({exitCode: 10, stdout: '', stderr: stderrResult});
      });
    });

    //Act + Assert
    await expect(async () => {
      await cacheUtils.getCommandOutput('command');
    }).rejects.toThrow();
  });
});

describe('getPackageManagerInfo', () => {
  it('should return package manager info in case of valid package manager name', async () => {
    //Arrange
    const packageManagerName = 'default';
    const expectedResult = {
      dependencyFilePattern: 'go.mod',
      moduleCacheFolderCommand: 'go env GOMODCACHE',
      buildCacheFolderCommand: 'go env GOCACHE'
    };

    //Act + Assert
    return cacheUtils
      .getPackageManagerInfo(packageManagerName)
      .then(data => expect(data).toEqual(expectedResult));
  });

  it('should throw the error in case of invalid package manager name', async () => {
    //Arrange
    const packageManagerName = 'invalidName';

    //Act + Assert
    await expect(async () => {
      await cacheUtils.getPackageManagerInfo(packageManagerName);
    }).rejects.toThrow();
  });
});

describe('getModuleCacheDirectoryPath', () => {
  //Arrange
  const getExecOutputSpy = jest.spyOn(exec, 'getExecOutput');

  const validPackageManager: PackageManagerInfo = {
    dependencyFilePattern: 'go.mod',
    moduleCacheFolderCommand: 'go env GOMODCACHE',
    buildCacheFolderCommand: 'go env GOCACHE'
  };

  it('should return path to the module cache folder', async () => {
    //Arrange
    getExecOutputSpy.mockImplementation((commandLine: string) => {
      return new Promise<exec.ExecOutput>(resolve => {
        resolve({ exitCode: 0, stdout: 'path/to/module/cache', stderr: '' });
      });
    });

    //Act + Assert
    return cacheUtils
      .getModuleCacheDirectoryPath(validPackageManager)
      .then(data => expect(data).toEqual('path/to/module/cache'));
  });

  it('should throw if the command fails', async () => {
    getExecOutputSpy.mockImplementation((commandLine: string) => {
      return new Promise<exec.ExecOutput>(resolve => {
        resolve({ exitCode: 10, stdout: '', stderr: 'Error message' });
      });
    });

    //Act + Assert
    await expect(async () => {
      await cacheUtils.getModuleCacheDirectoryPath(validPackageManager);
    }).rejects.toThrow();
  });
});

describe('getBuildCacheDirectoryPath', () => {
  //Arrange
  const getExecOutputSpy = jest.spyOn(exec, 'getExecOutput');

  const validPackageManager: PackageManagerInfo = {
    dependencyFilePattern: 'go.mod',
    moduleCacheFolderCommand: 'go env GOMODCACHE',
    buildCacheFolderCommand: 'go env GOCACHE'
  };

  it('should return path to the build cache folder', async () => {
  //Arrange
    getExecOutputSpy.mockImplementation((commandLine: string) => {
      return new Promise<exec.ExecOutput>(resolve => {
        resolve({ exitCode: 0, stdout: 'path/to/build/cache', stderr: '' });
      });
    });

    //Act + Assert
    return cacheUtils
      .getBuildCacheDirectoryPath(validPackageManager)
      .then(data => expect(data).toEqual('path/to/build/cache'));
  });

  it('should throw if the command fails', async () => {
    getExecOutputSpy.mockImplementation((commandLine: string) => {
      return new Promise<exec.ExecOutput>(resolve => {
        resolve({exitCode: 10, stdout: '', stderr: 'Error message'});
      });
    });

    //Act + Assert
    await expect(async () => {
      await cacheUtils.getBuildCacheDirectoryPath(validPackageManager);
    }).rejects.toThrow();
  });
});

describe('isCacheFeatureAvailable', () => {
  //Arrange
  const isFeatureAvailableSpy = jest.spyOn(cache, 'isFeatureAvailable');
  const warningSpy = jest.spyOn(core, 'warning');

  it('should return true when cache feature is available', () => {
    //Arrange
    isFeatureAvailableSpy.mockImplementation(() => {
      return true;
    });

    //Act
    const functionResult = cacheUtils.isCacheFeatureAvailable();

    //Assert
    expect(functionResult).toBeTruthy();
  });

  it('should warn when cache feature is unavailable and GHES is not used', () => {
    //Arrange
    isFeatureAvailableSpy.mockImplementation(() => {
      return false;
    });

    process.env['GITHUB_SERVER_URL'] = 'https://github.com';

    const warningMessage =
      'The runner was not able to contact the cache service. Caching will be skipped';

    //Act
    cacheUtils.isCacheFeatureAvailable();

    //Assert
    expect(warningSpy).toHaveBeenCalledWith(warningMessage);
  });

  it('should return false when cache feature is unavailable', () => {
    //Arrange
    isFeatureAvailableSpy.mockImplementation(() => {
      return false;
    });

    process.env['GITHUB_SERVER_URL'] = 'https://github.com';

    //Act
    const functionResult = cacheUtils.isCacheFeatureAvailable();

    //Assert
    expect(functionResult).toBeFalsy();
  });

  it('should warn when cache feature is unavailable and GHES is used', () => {
    //Arrange
    isFeatureAvailableSpy.mockImplementation(() => {
      return false;
    });

    process.env['GITHUB_SERVER_URL'] = 'https://nongithub.com';

    const warningMessage =
      'Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.';

    //Act + Assert
    expect(cacheUtils.isCacheFeatureAvailable()).toBeFalsy();
    expect(warningSpy).toHaveBeenCalledWith(warningMessage);
  });
});

describe('isGhes', () => {
  const pristineEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {...pristineEnv};
  });

  afterAll(() => {
    process.env = pristineEnv;
  });

  it('returns false when the GITHUB_SERVER_URL environment variable is not defined', async () => {
    delete process.env['GITHUB_SERVER_URL'];
    expect(cacheUtils.isGhes()).toBeFalsy();
  });

  it('returns false when the GITHUB_SERVER_URL environment variable is set to github.com', async () => {
    process.env['GITHUB_SERVER_URL'] = 'https://github.com';
    expect(cacheUtils.isGhes()).toBeFalsy();
  });

  it('returns false when the GITHUB_SERVER_URL environment variable is set to a GitHub Enterprise Cloud-style URL', async () => {
    process.env['GITHUB_SERVER_URL'] = 'https://contoso.ghe.com';
    expect(cacheUtils.isGhes()).toBeFalsy();
  });

  it('returns false when the GITHUB_SERVER_URL environment variable has a .localhost suffix', async () => {
    process.env['GITHUB_SERVER_URL'] = 'https://mock-github.localhost';
    expect(cacheUtils.isGhes()).toBeFalsy();
  });

  it('returns true when the GITHUB_SERVER_URL environment variable is set to some other URL', async () => {
    process.env['GITHUB_SERVER_URL'] = 'https://src.onpremise.fabrikam.com';
    expect(cacheUtils.isGhes()).toBeTruthy();
  });
});

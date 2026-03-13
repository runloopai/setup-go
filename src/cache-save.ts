import * as core from '@actions/core';
import * as cache from '@actions/cache';
import fs from 'fs';
import {State} from './constants';
import {
  getModuleCacheDirectoryPath,
  getBuildCacheDirectoryPath,
  getPackageManagerInfo
} from './cache-utils';

// Catch and log any unhandled exceptions.  These exceptions can leak out of the uploadChunk method in
// @actions/toolkit when a failed upload closes the file descriptor causing any in-process reads to
// throw an uncaught exception.  Instead of failing this action, just warn.
process.on('uncaughtException', e => {
  const warningPrefix = '[warning]';
  core.info(`${warningPrefix}${e.message}`);
});

// Added early exit to resolve issue with slow post action step:
// - https://github.com/actions/setup-node/issues/878
// https://github.com/actions/cache/pull/1217

export async function run(earlyExit?: boolean) {
  try {
    const cacheInput = core.getBooleanInput('cache');
    const buildCacheInput = core.getBooleanInput('build-cache');

    if (cacheInput) {
      await cacheModules();
    }

    if (buildCacheInput) {
      await cacheBuildArtifacts();
    }

    if ((cacheInput || buildCacheInput) && earlyExit) {
      process.exit(0);
    }
  } catch (error) {
    let message = 'Unknown error!';
    if (error instanceof Error) {
      message = error.message;
    }
    if (typeof error === 'string') {
      message = error;
    }
    core.warning(message);
  }
}

const cacheModules = async () => {
  const packageManager = 'default';

  const state = core.getState(State.CacheMatchedKey);
  const primaryKey = core.getState(State.CachePrimaryKey);

  const packageManagerInfo = await getPackageManagerInfo(packageManager);

  const moduleCachePath = await getModuleCacheDirectoryPath(packageManagerInfo);

  if (!fs.existsSync(moduleCachePath)) {
    core.warning('Module cache folder does not exist on disk');
    return;
  }

  if (!primaryKey) {
    core.info(
      'Module cache primary key was not generated. Please check the log messages above for more errors or information'
    );
    return;
  }

  if (primaryKey === state) {
    core.info(
      `Module cache hit occurred on the primary key ${primaryKey}, not saving cache.`
    );
    return;
  }

  const cacheId = await cache.saveCache([moduleCachePath], primaryKey);
  if (cacheId === -1) {
    return;
  }
  core.info(`Module cache saved with the key: ${primaryKey}`);
};

const cacheBuildArtifacts = async () => {
  const packageManager = 'default';

  const state = core.getState(State.BuildCacheMatchedKey);
  const primaryKey = core.getState(State.BuildCachePrimaryKey);

  const packageManagerInfo = await getPackageManagerInfo(packageManager);

  const buildCachePath = await getBuildCacheDirectoryPath(packageManagerInfo);

  if (!fs.existsSync(buildCachePath)) {
    core.warning('Build cache folder does not exist on disk');
    return;
  }

  if (!primaryKey) {
    core.info(
      'Build cache primary key was not generated. Please check the log messages above for more errors or information'
    );
    return;
  }

  if (primaryKey === state) {
    core.info(
      `Build cache hit occurred on the primary key ${primaryKey}, not saving cache.`
    );
    return;
  }

  const cacheId = await cache.saveCache([buildCachePath], primaryKey);
  if (cacheId === -1) {
    return;
  }
  core.info(`Build cache saved with the key: ${primaryKey}`);
};

run(true);

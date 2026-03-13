type SupportedPackageManagers = {
  [prop: string]: PackageManagerInfo;
};

export interface PackageManagerInfo {
  dependencyFilePattern: string;
  moduleCacheFolderCommand: string;
  buildCacheFolderCommand: string;
}

export const supportedPackageManagers: SupportedPackageManagers = {
  default: {
    dependencyFilePattern: 'go.mod',
    moduleCacheFolderCommand: 'go env GOMODCACHE',
    buildCacheFolderCommand: 'go env GOCACHE'
  }
};

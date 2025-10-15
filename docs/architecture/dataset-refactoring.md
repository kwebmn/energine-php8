# DataSet / DBDataSet refactoring notes

This document summarises the first infrastructural steps towards the new
architecture for data driven components in Energine.

## New provider contracts

* Introduced `DataProviderInterface` as an abstraction for loading data
  descriptions, executing queries and running post-processing.  The
  contract mirrors the legacy expectations of `DataSet` so existing
  components can gradually switch to custom providers without copying
  base logic.
* Added lightweight `QueryOptions`, `FilterCollection` and
  `SortCollection` helper classes that encapsulate transport objects for
  filters, sorting and pagination settings.

## DataSet improvements

* `DataSet` can now be supplied with any implementation of
  `DataProviderInterface`.  When a provider is configured the component
  delegates `loadData()` and `loadDataDescription()` work to it.
* The data description creation is split into two extensible stages:
  configuration loading (`createConfigDataDescription`) and merging with
  an external description (`mergeExternalDataDescription`).
* Added lifecycle hooks: `beforeLoadData`, `afterLoadData`,
  `beforeBuildView` and `afterBuildView`.  They allow inheritors to
  extend behaviour without duplicating the base implementation.

## DBDataSet compatibility

* `DBDataSet` now respects an injected data provider.  When present it
  reuses the new plumbing in `DataSet` while keeping the legacy logic as
  a fallback.

These changes keep the existing public API intact yet introduce
extension points required for the full migration described in the
technical specification.

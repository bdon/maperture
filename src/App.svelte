<script>
  import mapboxgl from 'mapbox-gl';
  import maplibregl from 'maplibre-gl';
  import * as pmtiles from 'pmtiles';
  import { onMount } from 'svelte';
  import {
    maps as mapsStore,
    stylePresets as stylePresetsStore,
    config as configStore,
    mapLocations as mapLocationsStore,
    linkLocations as linkLocationsStore,
  } from './stores';
  import { makeConfig } from './make-config';
  import { loadPresetsFromUrl } from './presets-utils';
  import Maps from './components/Maps.svelte';
  import MapControls from './components/MapControls.svelte';
  import { createHashString, writeHash } from './query';
  import { getSettings } from './settings';
  import { validateMapState } from './map-state-utils';
  import throttle from 'lodash.throttle';
  import isEqual from 'lodash.isequal';

  export let localConfig;

  // config is set only once on load and is assumed to be loaded from a module
  const config = makeConfig(localConfig);
  const { mapboxGlAccessToken, stylePresetUrls } = config;
  configStore.set(config);

  // settings contains all of the current state of the app that we might want to
  // persist in the URL
  let settings = getSettings(config);

  // mapState is a convenience object, subset of settings
  let mapState = {};

  // Track when the app is attempting to write the hash
  let writingHash = false;

  const hashShouldUpdate = () =>
    location.hash.slice(1) !== createHashString(settings)?.nextHash;

  // Set maps and presets initially using settings
  mapsStore.set(settings.maps.map((map, index) => ({ ...map, index })));
  stylePresetsStore.set(settings.stylePresets);
  mapLocationsStore.set(settings?.locations ?? null);
  if ($mapLocationsStore && $mapLocationsStore.length) {
    linkLocationsStore.set(false);
  }

  // Since maps comes from settings, only reset as needed
  let maps = [];
  $: if (!isEqual(maps, settings.maps)) {
    maps = settings.maps;
  }

  // Validate map state when maps change too
  $: mapState = validateMapState(mapState, maps);

  onMount(() => {
    // If we have URLs for preset files, get them and update presets
    if (stylePresetUrls.length > 0) {
      stylePresetUrls.forEach(async url => {
        const presets = await loadPresetsFromUrl(url);
        stylePresetsStore.update(current => [...current, ...presets]);
      });
    }
  });

  // Detect changes in hash and update settings appropriately
  window.addEventListener('hashchange', () => {
    if (!writingHash && hashShouldUpdate()) {
      const nextSettings = getSettings(config);
      settings = nextSettings;

      // Update mapsStore if necessary
      if (settings.maps.length) {
        const newMaps = settings.maps.map((map, index) => ({
          ...map,
          index,
        }));
        mapsStore.set(newMaps);
      }
    }

    // Reset so we will see the next change
    writingHash = false;
  });

  mapsStore.subscribe(maps => {
    settings = { ...settings, maps };
  });

  mapLocationsStore.subscribe(locations => {
    settings = { ...settings, locations };
  });

  linkLocationsStore.subscribe(value => {
    if (!value && !$mapLocationsStore) {
      const mapLocations = maps.map(() => mapState);
      mapLocationsStore.set(mapLocations);
    }
    if (value && $mapLocationsStore) {
      mapLocationsStore.set(null);
    }
  });

  // Throttle writing to the hash since this can get invoked many times when
  // moving the map around
  const throttledWriteHash = throttle(() => {
    if (hashShouldUpdate()) {
      writingHash = true;
      writeHash(settings);
    }
  }, 250);

  const createMapState = () => {
    const {
      bearing,
      center,
      pitch,
      showCollisions,
      showBoundaries,
      showDiff,
      zoom,
      height,
      width,
    } = settings;

    return {
      bearing,
      center,
      pitch,
      showCollisions,
      showBoundaries,
      showDiff,
      zoom,
      ...(height && { height }),
      ...(width && { width }),
    };
  };

  const handleMapState = event => {
    let newMapState = {
      ...mapState,
      ...event.detail.options,
    };

    settings = {
      ...settings,
      ...validateMapState(newMapState, maps),
    };
  };

  const handleViewMode = event => {
    settings = {
      ...settings,
      viewMode: event.detail.mode,
    };
  };

  const handleDimensions = event => {
    settings = {
      ...settings,
      // contains width and height
      ...event.detail,
    };
  };

  $: if (settings) throttledWriteHash();

  $: if (settings || height || width) mapState = createMapState();

  // Set RTL plugin once rather than per map
  mapboxgl.setRTLTextPlugin(
    'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.0/mapbox-gl-rtl-text.js'
  );
  maplibregl.setRTLTextPlugin(
    'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js'
  );
  maplibregl.addProtocol('pmtiles', new pmtiles.Protocol().tile);
</script>

<svelte:head>
  <base href="process.env.BASE_PATH" />
</svelte:head>
<main>
  <Maps
    {maps}
    {mapState}
    viewMode={settings.viewMode}
    on:mapState={handleMapState}
    on:setDimensions={handleDimensions}
  />

  <div class="map-controls-container">
    <MapControls
      {mapboxGlAccessToken}
      {...mapState}
      viewMode={settings.viewMode}
      on:mapState={handleMapState}
      on:viewMode={handleViewMode}
    />
  </div>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .map-controls-container {
    display: flex;
    flex-direction: row;
    justify-content: center;
    pointer-events: none;
    position: absolute;
    top: 1em;
    width: 100%;
    z-index: 2000;
  }
</style>

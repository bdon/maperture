const mapboxGlAccessToken = '';

// Example of setting up a gazetteer object. This is described in the `README`
// but these are the options that populate the dropdown in the UI that take you
// to specific locations or map views. You can add as many as you like here and
// create groupings (in this example, the only group is called Locations).
const gazetteer = {
  Locations: [
    {
      'San Francisco, CA': {
        zoom: 18,
        center: { lng: -122.4193, lat: 37.7648 },
      },
    },
    {
      'Washington DC': { zoom: 12, center: { lng: -77.0435, lat: 38.9098 } },
    },
  ],
};

const stylePresets = [
  {
    id: 'osm-carto',
    name: 'OSM Carto',
    type: 'maplibre-gl',
    renderer: 'maplibre-gl',
    url: 'config/osm-carto.json',
  },
  {
    id: 'protomaps-v2-debug',
    name: 'Protomaps V2 Debug',
    type: 'maplibre-gl',
    renderer: 'maplibre-gl',
    url: 'config/protomaps-v2.json',
  },
];

export { gazetteer, mapboxGlAccessToken, stylePresets };

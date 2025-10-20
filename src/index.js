import 'maplibre-gl/dist/maplibre-gl.css';
import './css/map.css';
import maplibregl from 'maplibre-gl';
import { App } from './js/app.js';

const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        glyphs: "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=ZNQWXcznKtXVNVM4MoQE",
        sources: {
            // --- BASEMAP SOURCES ---
            osm: { 
                type: 'raster', 
                tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'], 
                tileSize: 256, 
                attribution: 'Carte des découvertes archéologiques dans le quartier des Palais Royaux, Alexandrie © CEAlex. © OpenStreetMap Contributors' 
            },
            satellite: { 
                type: 'raster', 
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], 
                tileSize: 256, 
                attribution: 'Tiles &copy; Esri' 
            },
            
            // --- TEGOLA SOURCE (POINTS) ---
            tegola_points: { type: 'vector', tiles: ['http://localhost:8080/maps/cartalex/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },

            // --- PG_TILESERV SOURCES ---
            pgts_parcelles_region: { type: 'vector', tiles: ['http://localhost:7800/public.parcelles_region/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },
            pgts_espaces_publics: { type: 'vector', tiles: ['http://localhost:7800/public.espaces_publics/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },
            pgts_emprises: { type: 'vector', tiles: ['http://localhost:7800/public.emprises/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },
            pgts_noms_rues: { type: 'vector', tiles: ['http://localhost:7800/public.noms_rues/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },
            pgts_littoral: { type: 'vector', tiles: ['http://localhost:7800/public.littoral/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },

            // --- HISTORICAL MAP SOURCES ---
            "plan-adriani": { type: "raster", tiles: ["/adriani/{z}/{x}/{y}.png"], tileSize: 256, attribution: "Plan d'Adriani, 1934" },
            "plan-tkaczow": { type: "raster", tiles: ["/tkaczow/{z}/{x}/{y}.png"], tileSize: 256, attribution: "Plan de Tkaczow, 1993" },
            "plan-falaky":  { type: "raster", tiles: ["/falaky/{z}/{x}/{y}.png"],  tileSize: 256, attribution: "Restitution de Mahmoud Bey el-Falaki, 1866" },
            "plan-de-tkaczow-east": { type: "raster", tiles: ["/tkaczow east/{z}/{x}/{y}.png"], tileSize: 256, attribution: "Plan de Tkaczow east" },
            "plan-de-tkaczow-west": { type: "raster", tiles: ["/tkaczow west/{z}/{x}/{y}.png"], tileSize: 256, attribution: "Plan de Tkaczow west" },
        },
        layers: [
            
            // --- BASE & HISTORICAL LAYERS ---
            { id: 'osm-background', type: 'raster', source: 'osm', layout: { 'visibility': 'visible' } },
            { id: 'satellite-background', type: 'raster', source: 'satellite', layout: { 'visibility': 'none' } },
            { id: "Plan d'Adriani, 1934", type: "raster", source: "plan-adriani", layout: { "visibility": "none" } },
            { id: "Plan de Tkaczow, 1993", type: "raster", source: "plan-tkaczow", layout: { "visibility": "none" } },
            { id: "Restitution de Mahmoud bey el-Falaki, 1866",  type: "raster", source: "plan-falaky",  layout: { "visibility": "none" } },
            { id: "Plan de Tkaczow east", type: "raster", source: "plan-de-tkaczow-east", layout: { "visibility": "none" } },
            { id: "Plan de Tkaczow west", type: "raster", source: "plan-de-tkaczow-west", layout: { "visibility": "none" } },
            
            
            // --- VECTOR DATA LAYERS (OFF by default) ---
            { id: 'parcelles_region-fill', type: 'fill', source: 'pgts_parcelles_region', 'source-layer': 'public.parcelles_region', layout: { 'visibility': 'none' }, paint: { 'fill-color': 'rgba(1, 211, 226, 0.51)', 'fill-outline-color': '#303030' } },
            { id: 'espaces_publics-fill',  type: 'fill', source: 'pgts_espaces_publics',  'source-layer': 'public.espaces_publics',  layout: { 'visibility': 'none' }, paint: { 'fill-color': 'rgba(4, 240, 122, 0.63)', 'fill-outline-color': '#303030' } },
            { id: 'emprises-fill',         type: 'fill', source: 'pgts_emprises',         'source-layer': 'public.emprises',         layout: { 'visibility': 'none' }, paint: { 'fill-color': 'rgba(255, 72, 0, 0.52)', 'fill-outline-color': '#303030' } },

            // --- STREET NAMES AS LABELS ---
            {
                id: 'noms_rues-labels',
                type: 'symbol',
                source: 'pgts_noms_rues',
                'source-layer': 'public.noms_rues',
                layout: {
                    'visibility': 'none',
                    'text-field': ['get', 'noms'],
                    'text-size': 12,
                    'text-font': ['Open Sans Bold']
                },
                paint: {
                    'text-color': '#ffa500',
                    'text-halo-color': 'rgb(0, 0, 0)',
                    'text-halo-width': 1.5
                }
            },

            { id: 'littoral-line', type: 'line', source: 'pgts_littoral', 'source-layer': 'public.littoral', layout: { 'visibility': 'none' }, paint: { 'line-color': 'rgb(155, 0, 245)', 'line-width': 2 } },
            
            // START: HOVER EFFECT ADDITION
            // This layer is for the expanding "radio wave" effect.
            // It is a circle that will have its radius and opacity animated.
            {
                id: 'sites_fouilles-waves',
                type: 'circle',
                source: 'tegola_points',
                'source-layer': 'sites_fouilles',
                paint: {
                    'circle-radius': 8,
                    'circle-radius-transition': { duration: 0 },
                    'circle-opacity-transition': { duration: 0 },
                    'circle-color': 'rgb(251, 255, 0)',
                    'circle-stroke-color': 'yellow',
                    'circle-stroke-width': 4
                },
                // The filter ensures this layer only renders for the hovered feature.
                filter: ['==', ['id'], '']
            },
            // This layer creates the "heartbeat" pulse effect behind the main point.
            {
                id: 'sites_fouilles-pulse',
                type: 'circle',
                source: 'tegola_points',
                'source-layer': 'sites_fouilles',
                paint: {
                    'circle-radius': 6,
                    'circle-color': 'rgb(251, 255, 0)',
                    'circle-stroke-color': 'yellow',
                    'circle-stroke-width': 1.5,
                    'circle-opacity': 1.0
                },
                // The filter ensures this layer only renders for the hovered feature.
                filter: ['==', ['id'], '']
            },
            // END: HOVER EFFECT ADDITION

            // --- POINT LAYER ---
            { 
                id: 'sites_fouilles-points', 
                type: 'circle', 
                source: 'tegola_points', 
                'source-layer': 'sites_fouilles', 
                paint: { 
                    'circle-radius': 6, 
                    'circle-color': 'rgba(122, 21, 204, 0.9)', 
                    'circle-stroke-color': 'white', 
                    'circle-stroke-width': 1.5 
                } 
            }
        ]
    },
    center: [29.9187, 31.2001],
    zoom: 14,
    attributionControl: false
});

map.addControl(new maplibregl.NavigationControl());

// --- Extra Controls ---
map.addControl(new maplibregl.AttributionControl({
    customAttribution: ''
}), 'bottom-right');

map.addControl(new maplibregl.ScaleControl({
    maxWidth: 100,
    unit: 'metric'
}), 'bottom-left');

map.on('load', () => {
    const app = new App(map);
    app.initialize();

    // --- Coordinates Display ---
    const coordinatesDisplay = document.getElementById('coordinates-display');
    const center = map.getCenter();
    coordinatesDisplay.innerHTML = `Lat/Lon (WGS84): ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;

    map.on('mousemove', (e) => {
        coordinatesDisplay.innerHTML = `Lat/Lon (WGS84): ${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`;
    });
});
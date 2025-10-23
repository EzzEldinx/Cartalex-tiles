import maplibregl from 'maplibre-gl';
import { FilterCollection } from './FilterCollection.js';
import { filters_config } from './filters_config.js';
import { server_config } from './server_config.js';
import { buildFilterUI, buildLayerList, attachAllEventListeners } from './ui.js';
import { DistanceMeasure } from './DistanceMeasure.js';

// Define colors here
const defaultPointColor = 'rgb(155, 0, 245)'; // Your original color
const highlightPointColor = 'rgb(15, 150, 36)';      // Example highlight color (Yellow)

export class App {
    constructor(map) {
        this.map = map;
        this.filterCollection = null;
        this.popup = null;
        this.historicalMapIds = [
            "Plan d'Adriani, 1934",
            "Plan de Tkaczow, 1993",
            "Restitution de Mahmoud bey el-Falaki, 1866",
            "Plan de Tkaczow east",
            "Plan de Tkaczow west"
        ];
        this.hoveredFid = null;
        this.distanceMeasure = null;

        this.injectToastStyles();
    }

    async initialize() {
        console.log('Initializing application...');
        try {
            await this.initFilters();
            this.initLayerList();
            this.initEventListeners();
            this.initMapClickListener();
            this.initDeepLinkHandlers();
            this.initHoverEffect();
            this.initDistanceMeasure();
            // Apply default style initially
            this.applyHighlightStyle(undefined); // Call with undefined to set all to default
            console.log('Application initialized successfully.');
        } catch (error) {
            console.error("Failed to initialize the application:", error);
        }
    }

    async initFilters() {
        const layerName = 'sitesFouilles';
        this.filterCollection = new FilterCollection(layerName, filters_config[layerName], server_config.api_at);
        await this.filterCollection.initFilters();
        buildFilterUI(this.filterCollection.getFilters());
    }

    initLayerList() {
        const allLayers = this.map.getStyle().layers;
        const layersForUI = allLayers.filter(layer => {
            return !(layer.metadata && layer.metadata['filter-ui'] === 'ignore');
        });
        const desiredOrder = [
            'sites_fouilles-points',
            'emprises-fill',
            'espaces_publics-fill',
            'littoral-line',
            'parcelles_region-fill',
            'Plan de Tkaczow west',
            'Plan de Tkaczow east',
            'Plan de Tkaczow, 1993',
            "Plan d'Adriani, 1934",
            'Restitution de Mahmoud bey el-Falaki, 1866',
            'satellite-background',
            'osm-background'
        ];
        const sortedLayersForUI = layersForUI.sort((a, b) => {
            const indexA = desiredOrder.indexOf(a.id);
            const indexB = desiredOrder.indexOf(b.id);
            const effectiveIndexA = (indexA === -1) ? Infinity : indexA;
            const effectiveIndexB = (indexB === -1) ? Infinity : indexB;
            return effectiveIndexA - effectiveIndexB;
        });
        buildLayerList(sortedLayersForUI, this.map, this.historicalMapIds);
    }

    initEventListeners() {
        attachAllEventListeners(
            this.filterCollection.getFilters(),
            async () => { await this.updateMapFilter(); }, // Keep this callback as is
            (layerId, isVisible) => { this.toggleLayerVisibility(layerId, isVisible); },
            (layerId, opacity) => { this.setLayerOpacity(layerId, opacity); }
        );
    }

    initMapClickListener() {
        this.map.on('click', (e) => {
            if (this.distanceMeasure && this.distanceMeasure.isMeasurementActive()) {
                return;
            }
            const siteFeatures = this.map.queryRenderedFeatures(e.point, {
                layers: ['sites_fouilles-points']
            });
            if (siteFeatures.length > 0) {
                if (this.popup) { this.popup.remove(); }
                const feature = siteFeatures[0];
                const coordinates = feature.geometry.coordinates.slice();
                // --- IMPORTANT CHANGE: Use feature.id directly as it comes from Tegola ---
                const fid = feature.id; // Use feature.id directly

                const lngStr = Number(coordinates[0]).toFixed(6);
                const latStr = Number(coordinates[1]).toFixed(6);
                const coordsStr = `${latStr}, ${lngStr}`;
                this.copyToClipboard(coordsStr);
                this.showCopyConfirmation(coordsStr);
                this.flyToCoordinates(coordinates, { zoom: 18, duration: 2000 });
                const onMoveEnd = () => {
                    this.map.off('moveend', onMoveEnd);
                    // Pass the correct fid (feature.id)
                    this.showPopupForSite(fid, coordinates);
                };
                this.map.on('moveend', onMoveEnd);
                // Update URL with the correct fid (feature.id)
                this.updateUrlForPoint(fid);
            } else {
                const lng = e.lngLat.lng.toFixed(6);
                const lat = e.lngLat.lat.toFixed(6);
                const coords = `${lat}, ${lng}`;
                this.copyToClipboard(coords);
                this.showCopyConfirmation(coords);
            }
        });
        this.map.on('mouseenter', 'sites_fouilles-points', () => { this.map.getCanvas().style.cursor = 'pointer'; });
        this.map.on('mouseleave', 'sites_fouilles-points', () => { this.map.getCanvas().style.cursor = ''; });
    }

    initDeepLinkHandlers() {
        const params = new URLSearchParams(window.location.search);
        const pointParam = params.get('point');
        if (pointParam) {
             // --- IMPORTANT CHANGE: Handle fid as potentially string or number ---
            const fid = pointParam; // Keep as string initially
            this.focusPointByFid(fid); // Pass string fid
        }
        window.addEventListener('popstate', () => {
            const sp = new URLSearchParams(window.location.search);
            const p = sp.get('point');
            if (p) {
                 // --- IMPORTANT CHANGE: Handle fid as potentially string or number ---
                const fidPop = p; // Keep as string
                this.focusPointByFid(fidPop); // Pass string fid
            } else {
                if (this.popup) { this.popup.remove(); this.popup = null; }
            }
        });
    }

    updateUrlForPoint(fid) {
        const url = new URL(window.location.href);
         // --- IMPORTANT CHANGE: Ensure fid is stored as a string in URL ---
        url.searchParams.set('point', String(fid));
        window.history.pushState({}, '', url);
    }

    flyToCoordinates(coordinates, { zoom = 18, duration = 2000 } = {}) {
        this.map.flyTo({
            center: coordinates,
            zoom,
            duration,
            curve: 1.6,
            easing: (t) => 1 - Math.pow(1 - t, 2)
        });
    }

    async focusPointByFid(fid) { // fid can be string or number
        try {
            const coords = await this.getCoordinatesForFid(fid);
            if (!coords) {
                console.warn(`Could not find coordinates for fid: ${fid}`);
                return;
            }
            this.flyToCoordinates(coords, { zoom: 18, duration: 2000 });
            const onMoveEnd = () => {
                this.map.off('moveend', onMoveEnd);
                this.showPopupForSite(fid, coords); // Pass original fid
            };
            this.map.on('moveend', onMoveEnd);
        } catch (e) {
            console.error('Failed to focus point by fid', fid, e);
        }
    }

    async getCoordinatesForFid(targetFid) { // targetFid can be string or number
        const tryFind = () => {
            const features = this.map.querySourceFeatures('tegola_points', { sourceLayer: 'sites_fouilles' }) || [];
            for (const f of features) {
                // --- IMPORTANT CHANGE: Compare feature.id (can be string/number) with targetFid ---
                 if (String(f.id) === String(targetFid)) { // Compare as strings
                    const c = f.geometry.coordinates;
                    return Array.isArray(c) ? c.slice() : null;
                }
            }
            return null;
        };
        let found = tryFind();
        if (found) { return found; }
        const maxAttempts = 5;
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => {
                const handler = () => { this.map.off('idle', handler); resolve(); };
                this.map.on('idle', handler);
            });
            found = tryFind();
            if (found) { return found; }
        }
         console.warn(`Coordinates not found after multiple attempts for fid: ${targetFid}`);
        return null;
    }

    initHoverEffect() {
        this.map.on('mousemove', 'sites_fouilles-points', (e) => {
            if (e.features.length > 0) {
                 // --- IMPORTANT CHANGE: Use feature.id ---
                const currentFid = e.features[0].id;
                if (this.hoveredFid !== currentFid) {
                    if (this.hoveredFid !== null) {
                        this.map.setFeatureState(
                            { source: 'tegola_points', sourceLayer: 'sites_fouilles', id: this.hoveredFid },
                            { hover: false }
                        );
                    }
                    this.hoveredFid = currentFid;
                    this.map.setFeatureState(
                        { source: 'tegola_points', sourceLayer: 'sites_fouilles', id: this.hoveredFid },
                        { hover: true }
                    );
                }
            }
        });
        this.map.on('mouseleave', 'sites_fouilles-points', () => {
            if (this.hoveredFid !== null) {
                this.map.setFeatureState(
                    { source: 'tegola_points', sourceLayer: 'sites_fouilles', id: this.hoveredFid },
                    { hover: false }
                );
            }
            this.hoveredFid = null;
        });
        this.animateHoverEffect();
    }

    animateHoverEffect() {
        const radius = 6;
        const maxRadius = 15;
        let frame = 0;
        const animate = (timestamp) => {
            if (this.hoveredFid !== null) {
                 // --- IMPORTANT CHANGE: Filter using feature.id ---
                const filter = ['==', ['id'], this.hoveredFid];
                this.map.setFilter('sites_fouilles-pulse', filter);
                this.map.setFilter('sites_fouilles-waves', filter);
                const pulseRadius = radius + Math.sin(timestamp / 300) * 1.5;
                this.map.setPaintProperty('sites_fouilles-pulse', 'circle-radius', pulseRadius);
                const waveRadius = (frame % maxRadius) + radius;
                const waveOpacity = 1 - (waveRadius / (maxRadius + radius));
                this.map.setPaintProperty('sites_fouilles-waves', 'circle-radius', waveRadius);
                this.map.setPaintProperty('sites_fouilles-waves', 'circle-opacity', waveOpacity > 0 ? waveOpacity : 0);
                frame += 0.3;
            } else {
                 // --- IMPORTANT CHANGE: Use correct null filter ---
                const nullFilter = ['==', ['id'], '']; // Keep this way to effectively hide
                this.map.setFilter('sites_fouilles-pulse', nullFilter);
                this.map.setFilter('sites_fouilles-waves', nullFilter);
                frame = 0;
            }
            requestAnimationFrame(animate);
        }
        animate(0);
    }

    async showPopupForSite(fid, coordinates) { // fid can be string or number
        try {
            // Fetch using the fid (which is feature.id, potentially string or number)
            const response = await fetch(`${server_config.api_at}/sitesFouilles/${fid}/details`);
            if (!response.ok) {
                 console.error(`API Error for fid ${fid}: ${response.status} ${response.statusText}`);
                const errorText = await response.text();
                console.error("Error details:", errorText);
                throw new Error(`API request failed for fid: ${fid}`);
            }
            const data = await response.json();

            // Check if data.details exists before accessing properties
            const details = data.details || {};
            const discoverer = details.inventeur || 'N/A';
            const discoveryDate = details.date_decouverte || 'N/A';
            const numTkaczow = details.num_tkaczow || 'N/A';

            const title = `<b>Fouilles ${discoverer} (${discoveryDate})</b><br>Num Tkaczow: ${numTkaczow}`;
            let html = `<div class="site-popup"><h4>${title}</h4>`;

            if (data.vestiges && data.vestiges.length > 0) {
                html += `<strong>Vestiges:</strong><ul>`;
                data.vestiges.forEach(v => {
                    const caracterisation = v.caracterisation || 'N/A';
                    const period = v.periode ? v.periode.split(' (')[0] : 'N/A';
                    html += `<li>${caracterisation} (${period})</li>`;
                });
                html += `</ul>`;
            }

            if (data.bibliographies && data.bibliographies.length > 0) {
                html += `<strong>Bibliographie sélective:</strong><ul>`;
                data.bibliographies.forEach(b => {
                    const author = b.auteur || 'N/A';
                    const docTitle = b.nom_document ? `“${b.nom_document}”` : 'N/A';
                    const year = b.annee || 'N/A';
                    const page = b.pages || 'N/A';
                    html += `<li>${author}, ${docTitle}, ${year}, p. ${page}.</li>`; // Added 'p.' for pages
                });
                html += `</ul>`;
            }

             // Add comment if available
             if (details.commentaire) {
                 html += `<p><strong>Commentaire:</strong> ${details.commentaire}</p>`;
             }

            html += `</div>`;
            if (this.popup) { this.popup.remove(); } // Ensure only one popup
            this.popup = new maplibregl.Popup({ closeOnClick: true, maxWidth: '300px' }) // Make popup wider
                .setLngLat(coordinates)
                .setHTML(html)
                .addTo(this.map);
        } catch (error) {
            console.error("Error creating popup for fid:", fid, error);
            // Optionally show a generic error message in the popup
            if (this.popup) { this.popup.remove(); }
             this.popup = new maplibregl.Popup()
                 .setLngLat(coordinates)
                 .setHTML(`<div class="site-popup"><h4>Error</h4><p>Could not load details for site ${fid}.</p></div>`)
                 .addTo(this.map);
        }
    }

    copyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try { document.execCommand('copy'); }
        catch (err) { console.error('Fallback: Unable to copy', err); }
        document.body.removeChild(textArea);
    }

    showCopyConfirmation(message) {
        const existingToast = document.querySelector('.copy-toast');
        if (existingToast) { existingToast.remove(); }
        const toast = document.createElement('div');
        toast.className = 'copy-toast';
        toast.textContent = `Copied to clipboard: ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '1'; toast.style.top = '40px'; }, 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.top = '20px';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    injectToastStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .copy-toast { /* ... styles ... */ }
        `;
        // Make sure styles are copied from previous turn if needed
        document.head.appendChild(style);
    }

    toggleLayerVisibility(layerId, isVisible) {
        const visibility = isVisible ? 'visible' : 'none';
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
        if (layerId === 'espaces_publics-fill') {
            this.map.setLayoutProperty('espaces_publics-line', 'visibility', visibility);
        } else if (layerId === 'emprises-fill') {
            this.map.setLayoutProperty('emprises-line', 'visibility', visibility);
        }
    }

    setLayerOpacity(layerId, opacity) {
        // ... (keep existing opacity logic)
        const layer = this.map.getLayer(layerId);
        if (!layer) {
            console.warn(`Attempted to set opacity on a non-existent layer: ${layerId}`);
            return;
        }
        if (layer.type === 'raster') {
            this.map.setPaintProperty(layerId, 'raster-opacity', opacity);
        } else if (layer.type === 'fill') {
            this.map.setPaintProperty(layerId, 'fill-opacity', opacity);
        } else {
            console.warn(`Layer type "${layer.type}" does not support opacity control.`);
        }
    }

    // --- NEW METHOD ---
    /**
     * Applies conditional styling to points based on filtered IDs.
     * @param {Array<string|number>|undefined} filteredIds - Array of feature IDs matching filters, or undefined if no filters.
     */
    applyHighlightStyle(filteredIds) {
        const layerId = 'sites_fouilles-points';
        let colorExpression;

        if (filteredIds === undefined || filteredIds === null) {
            // No filters active, use default color for all
            colorExpression = defaultPointColor;
        } else if (filteredIds.length === 0) {
            // Filters active, but result is empty. Use default color for all (effectively hiding via filter)
             colorExpression = defaultPointColor; // Or keep default, filter handles visibility
        }
         else {
            // Filters active and have results. Apply conditional coloring.
            // Ensure IDs in the literal array match the type expected by MapLibre (usually numbers or strings)
             const literalIds = filteredIds.map(id => {
                // Attempt to convert to number if possible, otherwise keep as string
                 const numId = Number(id);
                 return isNaN(numId) ? String(id) : numId;
             });

            colorExpression = [
                'case',
                // --- IMPORTANT CHANGE: Use ['id'] to get feature ID ---
                ['in', ['id'], ['literal', literalIds]],
                highlightPointColor, // Color for filtered points
                defaultPointColor    // Default color for non-filtered points
            ];
        }

        try {
            this.map.setPaintProperty(layerId, 'circle-color', colorExpression);
        } catch (error) {
            console.error("Error setting paint property for highlighting:", error);
            // Fallback to default color in case of error
             this.map.setPaintProperty(layerId, 'circle-color', defaultPointColor);
        }
    }

    // --- MODIFIED METHOD ---
    async updateMapFilter() {
        const activeFilters = this.filterCollection.getActiveFilters();
        let filteredIds; // Can be undefined, empty array, or array of IDs

        if (activeFilters.length === 0) {
            filteredIds = undefined; // Indicate no filters are active
            this.map.setFilter('sites_fouilles-points', null); // Show all points
        } else {
            // Fetch IDs based on the *intersection* of active filters
            filteredIds = await this.filterCollection.getFilteredIds(); // Returns array (possibly empty)

             if (filteredIds && filteredIds.length > 0) {
                 // Ensure IDs match the type used in the vector tiles (number or string)
                 const literalIdsForFilter = filteredIds.map(id => {
                     const numId = Number(id);
                     return isNaN(numId) ? String(id) : numId;
                 });
                 // Filter visibility: only show points whose ID is in the intersection
                 const visibilityFilter = ['in', ['id'], ['literal', literalIdsForFilter]];
                 this.map.setFilter('sites_fouilles-points', visibilityFilter);
             } else {
                 // No points match the intersection, filter to show none
                 this.map.setFilter('sites_fouilles-points', ['in', ['id'], '']); // Effectively hides all
            }
        }

        // Apply highlighting based on the intersection result
        this.applyHighlightStyle(filteredIds); // Pass undefined, empty array, or array of IDs
    }

    initDistanceMeasure() {
        this.distanceMeasure = new DistanceMeasure(this.map);
        console.log('Distance Measure tool initialized');
    }
}
import { getValuesFromSubFilter } from './server_api.js';

export class SubFilter {
    constructor(filter_name, subfilter_config) {
        this.name = subfilter_config['name']; // Internal identifier
        this.filter_name = filter_name;
        this.options = subfilter_config['options'] || {};
        this.request_options = subfilter_config['request_options'] || {};
        this.values = []; // Will store objects like { internalValue: '...', displayValue: '...', checked: false }

        // Determine the display name (alias first, fallback to name)
        this.displayName = this.request_options.alias || this.name;
        this.order = this.request_options.order || '';
        this.isNumeric = this.options.isNumeric || false;

        if (this.isNumeric) {
            this.enabled = false;
            this.floor = '';
            this.ceil = '';
        }
    }

    // No initRequestOptions or initOptions needed, handled in constructor

    async initValues() {
        let rawValues;
        if (!this.isNumeric) {
            rawValues = await getValuesFromSubFilter(this);
            console.log(`Received raw values for ${this.name}:`, rawValues);

            if (!Array.isArray(rawValues)) {
                console.warn(`Expected an array for ${this.name}, but received:`, rawValues);
                rawValues = [];
            }
            // Transform the raw data immediately
            this.values = rawValues.map(item => {
                // Determine the value used internally (should match the 'name' field)
                // And the value for display (should match the 'alias' or 'name')
                const internalValue = item[this.name];
                const displayValue = item[this.displayName] || internalValue; // Fallback display to internal if alias value not found

                return {
                    internalValue: internalValue, // Always use the original name key
                    displayValue: displayValue, // Use alias key if present, else original name key
                    checked: false
                };
            }).filter(item => item.internalValue !== undefined && item.internalValue !== null); // Filter out items where internalValue failed

        } else {
            // For numeric, we don't fetch distinct values, just store range info
            this.values = []; // No list values needed for numeric
        }
        this.unCheckAll(); // Reset check status
    }

    // Methods addValue and setValues are less relevant now, initValues transforms the data directly.

    getValues() {
        // Returns the transformed array: [{ internalValue: '...', displayValue: '...', checked: false }, ...]
        return this.values;
    }

    checkAll() {
        this.values.forEach(value => { value.checked = true; });
    }

    unCheckAll() {
        this.values.forEach(value => { value.checked = false; });
    }

    checkValue(internalContent) {
        // Find by internalValue
        try {
            const valueToUpdate = this.values.find(value => String(value.internalValue) === String(internalContent));
            if (valueToUpdate) {
                valueToUpdate.checked = true;
            } else {
                 console.warn(`checkValue: Could not find value for internalContent "${internalContent}"`);
            }
        } catch (error) {
            console.log(`Error checking value: ${internalContent}`, error);
        }
    }

    unCheckValue(internalContent) {
        // Find by internalValue
        try {
            const valueToUpdate = this.values.find(value => String(value.internalValue) === String(internalContent));
            if (valueToUpdate) {
                valueToUpdate.checked = false;
            } else {
                 console.warn(`unCheckValue: Could not find value for internalContent "${internalContent}"`);
            }
        } catch (error) {
            console.log(`Error unchecking value: ${internalContent}`, error);
        }
    }

    // Numeric filter methods remain the same
    setEnabled(enabled) { if (this.isNumeric) { this.enabled = enabled; } }
    isEnabled() { return this.isNumeric && this.enabled; }
    setCeil(ceil) { this.ceil = ceil; }
    getCeil() { return this.ceil; }
    setFloor(floor) { this.floor = floor; }
    getFloor() { return this.floor; }

    getSelectedValues() {
        // Return only the internalValues that are checked
        return this.values
            .filter(value => value.checked)
            .map(value => value.internalValue);
    }
}
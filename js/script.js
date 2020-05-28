/**
 * Script to initialize a Leaflet map and load the Dutch BAG wfs layer based on the users screen location on the map
 * 
 */


 // Global variables and functions
 var active_selection = null; // active feauture selected with mouse click for download option

// last feature selection with mouse click is remebered as active selection
function last_selection(layerFeature) {
    active_selection = layerFeature;
}

/**
 * 1. Initialize CRS, map and background layers
 */


// initialize Dutch RDnew CRS
var RDnew = "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs";

// initialize WGS84 CRS
var WGS84 = "WGS84";


// initialize bag layer group for wfs
var bag_layer = L.layerGroup();
var brk_layer = L.layerGroup();
var bestemming_layer = L.layerGroup();

// load a background tile layer
var baseMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    });

// BAG wms layer
var pand_wms = L.tileLayer.wms("https://geodata.nationaalgeoregister.nl/bag/wms/v1_1?request=getCapabilities&service=WMS", {
    layers: 'pand',
    format:'image/png',
    transparent: true,
    maxZoom: 21
});
pand_wms.addTo(bag_layer);
var pandWmsId = pand_wms._leaflet_id;

// BRK wms layer
var perceel_wms = L.tileLayer.wms("https://geodata.nationaalgeoregister.nl/kadastralekaart/wms/v4_0?service=WMS&version=1.3.0&request=GetCapabilities", {
    layers: 'Perceel',
    format:'image/png',
    transparent: true,
    maxZoom: 21
});
perceel_wms.addTo(brk_layer);
var perceelWmsId = perceel_wms._leaflet_id;

// ruimtelijke plannen enkelbestemming wms
var bestemming_enkel_wms = L.tileLayer.wms("https://geodata.nationaalgeoregister.nl/plu/ows?service=WMS&request=GetMap", {
    layers: 'Enkelbestemming',
    styles: 'plu:Enkelbestemming',
    format:'image/png',
    transparent: true,
    maxZoom: 21
}).addTo(bestemming_layer);

// ruimtelijke plannen bestemminsplangebied wms
var bestemmingsplangebied_wms = L.tileLayer.wms("https://geodata.nationaalgeoregister.nl/plu/ows?service=WMS&request=GetMap", {
    layers: 'Bestemmingsplangebied',
    format:'image/png',
    transparent: true,
    maxZoom: 21
}).addTo(bestemming_layer);

// legenda enkelbestemming



/**
 * 2. Load wfs overlay layer based on zoom level and bounding box of screen
 */

var styleBag = {
    "stroke": false,
    "color": "#ff7800",
    "weight": 5,
    "fillOpacity": 0.0
};

var styleBrk = {
    "stroke": true,
    "color": "black",
    "weight": 1,
    "fillOpacity": 0.0
};

var highlight = {
    stroke: true,
    width: 0.6,
    color: 'DeepSkyBlue',
    weight: 2,
    fillOpacity: 0.3
};

// selected feature at mouse click
var selected = null;

// highlight feature at mouse click
function highlightFeature(e) {
    if (selected) {
        selected.setStyle(styleBag);
    }
    selected = e.target;
    //selected.bringToFront();
    selected.setStyle(highlight);
}


// zoom level required for wfs layer to load
var load_wfs_zoom = 18;


// load all layers
function load_layers() {
    load_bag();
    load_brk();
}

// remove old wfs layer in layerGroup after new wfs call
function removeLayerById(layerGr) {
	layerGr.eachLayer(function (layer) {
        // only remove wfs layer and keep wms layer
		if (layer._leaflet_id !== pandWmsId && layer._leaflet_id !== perceelWmsId){
			layerGr.removeLayer(layer);
		}
	});	
}



// load BAG wfs layer
function load_bag() {
    removeLayerById(bag_layer);
    // check if zoom level is at required zoom level
    if (map.getZoom() >= load_wfs_zoom) {
        var url = 'https://geodata.nationaalgeoregister.nl/bag/wfs?';
        var params = 'request=GetFeature&';
            params += 'service=WFS&';
            params += 'typeName=bag:pand&';
            params += 'count=1000&';
            params += 'outputFormat=json&';
            params += 'srsName=EPSG:4326&';
            params += 'bbox=';
            params += proj4(WGS84, RDnew, [map.getBounds()._southWest.lng,map.getBounds()._southWest.lat]).toString();
            params += ',';
            params += proj4(WGS84, RDnew, [map.getBounds()._northEast.lng,map.getBounds()._northEast.lat]).toString();
        
        $.getJSON(url + params, function(data) {
            $.each(data.features, function(index, geometry) {
                L.geoJson(geometry, {
                    style: styleBag,
                    onEachFeature: onEachFeature
                }).addTo(bag_layer);
                //bag_layer.addTo(map);
            });
        });
    } else {
        console.log("please zoom in to see the polygons! Currenct zoom level:", map.getZoom(), ", Required zoom level:", load_wfs_zoom);
    }
}



// attributes in popup when clicked
function onEachFeature(feature, layer) {
    layer.bindPopup(
        ' <h3>Pand (BAG)</h3> '
        + '<br><strong>ID:</strong> ' + feature.properties.identificatie.toString() 
        + '<br><strong>Bouwjaar:</strong> ' + feature.properties.bouwjaar.toString()
        + '<br><strong>Status:</strong> ' + feature.properties.status.toString()
        + '<br><strong>Aantal verblijfsobjecten:</strong> ' + feature.properties.aantal_verblijfsobjecten.toString()
    );
    layer.on("click", function (e) {
        highlightFeature(e);
        last_selection(e.target);
      });
}



/*
  layer.on({
    click: highlightFeature
});
*/

// load BRK wfs layer
function load_brk() {
    removeLayerById(brk_layer);
    // check if zoom level is at required zoom level
    if (map.getZoom() >= load_wfs_zoom) {
        var url = 'https://geodata.nationaalgeoregister.nl/kadastralekaart/wfs/v4_0?';
        var params = 'service=WFS&';
            params += 'version=2.0.0&';
            params += 'request=GetFeature&';
            params += 'typeName=kadastralekaartv4:perceel&';
            params += 'count=1000&';
            params += 'outputFormat=json&';
            params += 'srsName=EPSG:4326&';
            params += 'bbox=';
            params += proj4(WGS84, RDnew, [map.getBounds()._southWest.lng,map.getBounds()._southWest.lat]).toString();
            params += ',';
            params += proj4(WGS84, RDnew, [map.getBounds()._northEast.lng,map.getBounds()._northEast.lat]).toString();

        $.getJSON(url + params, function(data) {
            $.each(data.features, function(index, geometry) {
                L.geoJson(geometry, {
                    style: styleBrk,
                    onEachFeature: onEachFeature2
                }).addTo(brk_layer);
            });
        });
    } else {
        console.log("please zoom in to see the polygons! Currenct zoom level:", map.getZoom(), ", Required zoom level:", load_wfs_zoom);
    }
}

// attributes in popup when clicked
function onEachFeature2(feature, layer) {
    layer.bindPopup(
        ' <h3>Kadastraal Perceel</h3> '
        + '<br><strong>Perceelnummer:</strong> ' + feature.properties.perceelnummer.toString()
        + '<br><strong>Perceel grootte:</strong> ' + feature.properties.kadastraleGrootteWaarde.toString() 
        + '<br><strong>Tijdstop registratie:</strong> ' + feature.properties.tijdstipRegistratie.toString() 
        + '<br><strong>Status historie:</strong> ' + feature.properties.statusHistorieWaarde.toString() 
        + '<br><strong>Gemeente, sectie:</strong> ' + feature.properties.kadastraleGemeenteWaarde.toString() + ', ' + feature.properties.sectie.toString()
    );
    layer.on({
        click: highlightFeature
    });
}



/**
 * 3. Order all layers and put them on the map
 */

// Overlay Maps
var overlayMaps = {
    "Bestemmingsplan": bestemming_layer
    ,"Percelen": brk_layer
    ,"Panden": bag_layer
}

// Base maps
var baseMaps = {
    "Kaart": baseMap
  };


// initialize the map
var map = L.map('map', {
    'layers': [
        baseMap,
        bag_layer
    ],
    maxZoom: 19
    }).setView([52.3667, 4.9000], 14);

// add layers to map
L.control.layers(baseMaps, overlayMaps).addTo(map);

// add search bar to map
var searchbar = L.Control.geocoder()
.addTo(map);
searchbar.setPosition("topleft");

// call function 'load_wfs' after interaction/move with map ends
map.on('moveend', load_layers);


// legend controls
var legend = null;

// add legend when bestemmingsplan layer is added
map.on('overlayadd', function (eventLayer) {
    if (eventLayer.name === 'Bestemmingsplan') {
        legend = L.wmsLegend("https://geodata.nationaalgeoregister.nl/plu/ows?service=WMS&request=GetLegendGraphic&format=image/png&width=15&height=15&layer=Enkelbestemming&");
    } 
});

// remove legend when layer bestemmingsplan is removed
map.on('overlayremove', function (eventLayer) {
    if (eventLayer.name === 'Bestemmingsplan') {
        map.removeControl(legend);
    } 
});



/*
Download selected data to csv
function to download the selected object to a csv output
*/

const objectToCsv = function(data) {
    var csvRows = [];
    // get the headers
    var headers = Object.keys(data[0]);
    csvRows.push(headers.join(';'));

    for (const row of data) {
        const values = headers.map(header => {
            const escaped = (''+row[header]).replace(/"/g, '\\"');
            return ('"'+escaped+'"');
        });
        csvRows.push(values.join(';'));
    }

    return csvRows.join('\n');

    /*
    // loop over the rows
    for (let [key, value] of Object.entries(data)) {
        console.log(`${key}: ${value}`);
    }
    */
    // form escaped comma separated values

}

const download = function(data) {
    const blob = new Blob([data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'download.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showSuccesfulDownload();
};

const showSuccesfulDownload = function() {
    Swal.fire({
        position: 'top-end',
        icon: 'success',
        title: 'Download succesful',
        showConfirmButton: false,
        timer: 1500
      })
}

const getReport = async function() {
    if (active_selection !== null) {
        try {
            // selection with mouse click (single object)
            var jsonData = active_selection.toGeoJSON();
            var data = jsonData.properties;
            const csvData = objectToCsv([data]); //put data in list to match input when multiple objects are selected
            download(csvData);
        } catch(err) {
            console.log('multiple objects selected');
        } try {
            //selection with lasso tools (multiple objects)
            var json = active_selection.toGeoJSON();
            var data = json.features;
            for (x in data) {
                data[x] = data[x].properties;
            };
            const csvData = objectToCsv(data);
            download(csvData);    
        } catch(err) {
            console.log('single object selected');
        }
    } else {
        Swal.fire({
            icon: 'warning',
            title: 'Download failed',
            text: 'Please select one or multiple objects first'
          })
    }
};


L.easyButton('fa-arrow-down', getReport).addTo(map);




/**  Feature Selection
 *   Select multiple features with lasso tool
 * 
 * 
 */



const mapElement = document.querySelector('#map');
const toggleLasso = document.querySelector('#toggleLasso');
const contain = document.querySelector('#contain');
const intersect = document.querySelector('#intersect');
const lassoEnabled = document.querySelector('#lassoEnabled');
const lassoResult = document.querySelector('#lassoResult');

const lassoControl = L.control.lasso().addTo(map);




function resetSelectedState() {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            layer.setIcon(new L.Icon.Default());
        } else if (layer instanceof L.Path) {
            layer.setStyle(styleBag);
        }
    });
}


function setSelectedLayers(layers) {
    resetSelectedState();
    var lasso_selection = L.layerGroup();
    layers.forEach(layer => {
        if (layer instanceof L.Marker) {
            layer.setIcon(new L.Icon.Default({ className: 'selection '}));
        } else if (layer instanceof L.Path) {
            layer.setStyle(highlight);
            layer.addTo(lasso_selection);
        }
    active_selection = lasso_selection;
    }); 
}



//map.on('mousedown', () => {
//    resetSelectedState();
//});
map.on('lasso.finished', event => {
    setSelectedLayers(event.layers);
});
map.on('lasso.enabled', () => {
    if (map.getZoom() < load_wfs_zoom) { 
        Swal.fire({
            icon: 'info',
            title: 'Do you want to select multiple objects?',
            text: 'Please zoom in on the map to enable this feature'
          })
        lassoControl.disable();
    } else {
        resetSelectedState();
    }
});
map.on('lasso.disabled', () => {
});

lassoControl.setOptions({ intersect: true });
lassoControl.setPosition('topleft');

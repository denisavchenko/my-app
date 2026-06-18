import '../style.css';
import {Map, View} from 'ol';
import Overlay from 'ol/Overlay';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import {fromLonLat} from 'ol/proj';
import {Circle as CircleStyle, Fill, Icon, Stroke, Style} from 'ol/style';

// импортирование иконок
import aeroportsIcon from '../data/icons/aeroports.png?url';
import attractionsIcon from '../data/icons/attractionsWC2026.png?url';
import experiencesIcon from '../data/icons/experiencesWC2026.png?url';
import fanFestivalsIcon from '../data/icons/fanFestivals.png?url';
import shuttleHubsIcon from '../data/icons/shuttleHubsWC2026.png?url';


// импортирование слоев
import aeroports from '../data/geodata/aeroports.geojson?url';
import worldCupStadiums from '../data/geodata/worldCupStadiums.geojson?url';
import fanFestivals from '../data/geodata/fanFestivals.geojson?url';
import shuttleHubs from '../data/geodata/shuttleHubsWC2026.geojson?url';
import attractions from '../data/geodata/attractionsWC2026.geojson?url';
import experiences from '../data/geodata/experiencesWC2026.geojson?url';
import isichronscar from '../data/geodata/isichronscar.geojson?url';


//определение формата координат для GeoJSON
const geojson = new GeoJSON({
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857',
});

// функция для создания слоя из GeoJSON файла
function layer(url, styleOrIcon, options = {}) {
  let style;
  if (typeof styleOrIcon === 'function') {
    style = styleOrIcon;
  } else if (styleOrIcon instanceof Style) {
    style = styleOrIcon;
  } else if (styleOrIcon) {
    style = new Style({
      image: new Icon({
        src: styleOrIcon,
        scale: 0.2,
      }),
    });
  }

  return new VectorLayer({
    source: new VectorSource({url, format: geojson}),
    style,
    renderOrder: options.renderOrder,
  });
}

// стиль для точек стадионов
const yellowPoint = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({color: '#FFD700'}),
    stroke: new Stroke({color: '#FFD700', width: 1}),
  }),
});

// стиль для изохрон по времени AA_MINS (20, 40, 60 мин)
const isochroneColors = {
  20: {fill: 'rgba(255, 0, 0, 0.35)', stroke: '#CC0000'},
  40: {fill: 'rgba(255, 0, 0, 0.2)', stroke: '#E60000'},
  60: {fill: 'rgba(255, 0, 0, 0.1)', stroke: '#FF0000'},
};

function isochroneStyle(feature) {
  const mins = feature.get('AA_MINS');
  const colors = isochroneColors[mins] || isochroneColors[60];

  return new Style({
    fill: new Fill({color: colors.fill}),
    stroke: new Stroke({color: colors.stroke, width: 2}),
  });
}

const basemaps = {
  //стандартная карта
  osm: new TileLayer({
    source: new OSM()
  }),

  //спутник
  satellite: new TileLayer({
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    }),
    visible: false,
  }),
};

// функция для смены базовой карты
function setBasemap(name) {
  Object.entries(basemaps).forEach(([key, basemapLayer]) => {
    basemapLayer.setVisible(key === name);
  });
}

document.getElementById('basemap').addEventListener('change', (event) => {
  setBasemap(event.target.value);
});

const map = new Map({
  target: 'map',
  layers: [
    ...Object.values(basemaps),
    layer(isichronscar, isochroneStyle, {
      renderOrder: (a, b) => b.get('AA_MINS') - a.get('AA_MINS'),
    }),
    layer(aeroports, aeroportsIcon),
    layer(worldCupStadiums, yellowPoint),
    layer(fanFestivals, fanFestivalsIcon),
    layer(shuttleHubs, shuttleHubsIcon),
    layer(attractions, attractionsIcon),
    layer(experiences, experiencesIcon),
  ],
  view: new View({
    center: fromLonLat([-80.1, 26.0]),
    zoom: 10,
  }),
});

// popup при клике по объекту
const popup = document.getElementById('popup');
const popupContent = document.getElementById('popup-content');
const popupOverlay = new Overlay({
  element: popup,
  autoPan: true,
});
// добавление popup на карту
map.addOverlay(popupOverlay);

// закрытие popup при клике на кнопку
document.getElementById('popup-closer').onclick = () => {
  popup.classList.remove('visible');
  popupOverlay.setPosition(undefined);
};

// открытие popup при клике по объекту
map.on('click', (event) => {
  const feature = map.forEachFeatureAtPixel(event.pixel, (f) => f, {hitTolerance: 5});

  if (!feature) {
    popup.classList.remove('visible');
    popupOverlay.setPosition(undefined);
    return;
  }

  const props = feature.getProperties();
  let html = '';

  if (props.name) {
    html += '<h3>' + props.name + '</h3>';
  } else if (props.AA_MINS) {
    html += '<h3>Изохрона ' + props.AA_MINS + ' мин</h3>';
  }

  for (const key in props) {
    if (key === 'geometry' || key === 'name') continue;
    html += '<p><b>' + key + ':</b> ' + props[key] + '</p>';
  }

  popupContent.innerHTML = html;
  popup.classList.add('visible');
  popupOverlay.setPosition(event.coordinate);
});

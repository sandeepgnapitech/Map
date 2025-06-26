import React, { useEffect, useRef } from 'react';
import { Button, message, Tooltip } from 'antd';
import { BorderOutlined } from '@ant-design/icons';
import Draw from 'ol/interaction/Draw';
import Overlay from 'ol/Overlay';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { LineString, Polygon } from 'ol/geom';
import { getArea, getLength } from 'ol/sphere';
import { unByKey } from 'ol/Observable';
import { useTool } from './contexts/ToolContext';

/**
 * MeasurementTool widget for measuring distances and areas on the map
 * @param {Object} props Component props
 * @param {import('ol').Map} props.map OpenLayers map instance
 * @returns {JSX.Element} Measurement tool button
 */
const MeasurementTool = ({ map }) => {
  const { activeTool, setToolActive } = useTool();
  const active = activeTool === 'measure';
  const measureTypeRef = useRef('LineString');
  const drawRef = useRef(null);
  const measureTooltipElementRef = useRef(null);
  const measureTooltipRef = useRef(null);
  const sourceRef = useRef(new VectorSource());
  const tooltipsRef = useRef([]); // Keep track of all tooltips

  const vectorRef = useRef(new VectorLayer({
    source: sourceRef.current,
    style: new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new Stroke({
        color: '#ffcc33',
        width: 2,
      }),
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({
          color: '#ffcc33',
        }),
      }),
    })
  }));

  // Initial setup and cleanup
  useEffect(() => {
    if (!map) return;

    // Add the vector layer to the map
    map.addLayer(vectorRef.current);

    return () => {
      if (map) {
        clearMeasurement();
        map.removeLayer(vectorRef.current);
      }
    };
  }, [map]);

  // Watch for active tool changes
  useEffect(() => {
    if (!map) return;

    if (!active) {
      clearMeasurement();
    }

    const handleMapClick = () => {
      if (!active) return;
      map.getTargetElement().style.cursor = 'crosshair';
    };

    const viewport = map.getViewport();
    viewport.addEventListener('click', handleMapClick);

    // Set cursor for measurement
    if (active) {
      map.getTargetElement().style.cursor = 'crosshair';
    }

    return () => {
      if (map) {
        viewport.removeEventListener('click', handleMapClick);
        map.getTargetElement().style.cursor = 'default';
      }
    };
  }, [map, active]);

  const createMeasureTooltip = () => {
    // Remove the previous tooltip element if it exists
    if (measureTooltipElementRef.current && measureTooltipElementRef.current.parentNode) {
      measureTooltipElementRef.current.parentNode.removeChild(measureTooltipElementRef.current);
    }

    const tooltipElement = document.createElement('div');
    tooltipElement.className = 'ol-tooltip ol-tooltip-measure';
    tooltipElement.style.position = 'absolute';
    tooltipElement.style.zIndex = '1000';
    tooltipElement.style.background = 'rgba(0, 0, 0, 0.7)';
    tooltipElement.style.borderRadius = '4px';
    tooltipElement.style.color = 'white';
    tooltipElement.style.padding = '4px 8px';
    tooltipElement.style.whiteSpace = 'nowrap';
    tooltipElement.style.fontSize = '12px';
    tooltipElement.style.pointerEvents = 'none';

    measureTooltipElementRef.current = tooltipElement;

    // Append tooltip to map viewport
    map.getViewport().appendChild(tooltipElement);

    const tooltip = new Overlay({
      element: tooltipElement,
      offset: [0, -15],
      positioning: 'bottom-center',
      stopEvent: false,
      insertFirst: false
    });

    measureTooltipRef.current = tooltip;
    tooltipsRef.current.push(tooltip);
    map.addOverlay(tooltip);
  };

  const formatLength = (line) => {
    const length = getLength(line);
    let output;
    if (length > 1000) {
      output = `${(length / 1000).toFixed(2)} km`;
    } else {
      output = `${Math.round(length)} m`;
    }
    return output;
  };

  const formatArea = (polygon) => {
    const area = getArea(polygon);
    let output;
    if (area > 10000) {
      output = `${(area / 1000000).toFixed(2)} km²`;
    } else {
      output = `${Math.round(area)} m²`;
    }
    return output;
  };

  const addInteraction = () => {
    if (!map) return;

    const drawInteraction = new Draw({
      source: sourceRef.current,
      type: measureTypeRef.current,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
        stroke: new Stroke({
          color: '#ffcc33',
          lineDash: [10, 10],
          width: 2,
        }),
        image: new CircleStyle({
          radius: 5,
          stroke: new Stroke({
            color: '#ffcc33',
          }),
          fill: new Fill({
            color: '#ffcc33',
          }),
        }),
      }),
    });

    let listener;
    createMeasureTooltip();

    drawInteraction.on('drawstart', (evt) => {
      sourceRef.current.clear();

      let tooltipCoord = evt.coordinate;

      listener = evt.feature.getGeometry().on('change', (e) => {
        const geom = e.target;
        let output;

        if (geom instanceof LineString) {
          output = formatLength(geom);
          tooltipCoord = geom.getLastCoordinate();
        } else if (geom instanceof Polygon) {
          output = formatArea(geom);
          tooltipCoord = geom.getInteriorPoint().getCoordinates();
        }

        if (measureTooltipElementRef.current && measureTooltipRef.current) {
          measureTooltipElementRef.current.innerHTML = output;
          measureTooltipRef.current.setPosition(tooltipCoord);
        }
      });
    });

    drawInteraction.on('drawend', () => {
      if (measureTooltipElementRef.current) {
        measureTooltipElementRef.current.className = 'ol-tooltip ol-tooltip-static';
      }
      if (measureTooltipRef.current) {
        measureTooltipRef.current.setOffset([0, -7]);
      }
      unByKey(listener);
      createMeasureTooltip();
    });

    map.addInteraction(drawInteraction);
    drawRef.current = drawInteraction;
  };

  const clearMeasurement = () => {
    // Remove draw interaction
    if (drawRef.current) {
      map.removeInteraction(drawRef.current);
      drawRef.current = null;
    }
    
    // Clear source
    sourceRef.current.clear();
    
    // Remove all tooltips and overlays
    tooltipsRef.current.forEach(tooltip => {
      if (tooltip) {
        const element = tooltip.getElement();
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
        map.removeOverlay(tooltip);
      }
    });
    tooltipsRef.current = [];
    
    measureTooltipRef.current = null;
    measureTooltipElementRef.current = null;

    // Reset cursor
    if (map && map.getTargetElement()) {
      map.getTargetElement().style.cursor = 'default';
    }
  };

  const toggleMeasure = () => {
    if (!map) return;

    if (!active) {
      setToolActive('measure', true);
      addInteraction();
      map.getTargetElement().style.cursor = 'crosshair';
      message.info('Measurement tool activated (Line). Click to toggle line/area.');
    } else {
      setToolActive('measure', false);
      clearMeasurement();
    }
  };

  const handleClick = () => {
    if (active) {
      measureTypeRef.current = measureTypeRef.current === 'LineString' ? 'Polygon' : 'LineString';
      clearMeasurement();
      addInteraction();
      message.info(`Switched to ${measureTypeRef.current === 'LineString' ? 'distance' : 'area'} measurement`);
    } else {
      toggleMeasure();
    }
  };

  if (!map) return null;

  return (
    <Tooltip title="Measure distances and areas (Click to toggle between line/area)">
      <Button
        type={active ? 'primary' : 'default'}
        icon={<BorderOutlined />}
        onClick={handleClick}
        style={{ minWidth: '40px', width: '40px', height: '40px', padding: 0 }}
      />
    </Tooltip>
  );
};

export default MeasurementTool;

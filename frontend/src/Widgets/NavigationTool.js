import React, { useEffect, useRef } from 'react';
import { Button, message, Tooltip } from 'antd';
import { CompassOutlined } from '@ant-design/icons';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { Point } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import { transform } from 'ol/proj';
import { useTool } from './contexts/ToolContext';

/**
 * NavigationTool widget for getting and tracking user's GPS location
 * @param {Object} props Component props
 * @param {import('ol').Map} props.map OpenLayers map instance
 * @returns {JSX.Element} Navigation tool button
 */
const NavigationTool = ({ map }) => {
  const { activeTool, setToolActive } = useTool();
  const active = activeTool === 'navigate';
  const watchIdRef = useRef(null);
  const sourceRef = useRef(new VectorSource());
  const vectorRef = useRef(new VectorLayer({
    source: sourceRef.current,
    style: new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({
          color: '#3498db'
        }),
        stroke: new Stroke({
          color: '#fff',
          width: 2
        })
      })
    })
  }));

  useEffect(() => {
    if (!map) return;

    map.addLayer(vectorRef.current);

    return () => {
      if (map) {
        map.removeLayer(vectorRef.current);
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    if (active) {
      if (!navigator.geolocation) {
        message.error('Geolocation is not supported by your browser');
        setToolActive('navigate', false);
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        updateLocation,
        handleLocationError,
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
      message.success('GPS tracking activated');
    } else {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      sourceRef.current.clear();
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [map, active]);

  const handleLocationError = (error) => {
    switch(error.code) {
      case error.PERMISSION_DENIED:
        message.error("Location permission denied");
        break;
      case error.POSITION_UNAVAILABLE:
        message.error("Location information unavailable");
        break;
      case error.TIMEOUT:
        message.error("Location request timed out");
        break;
      default:
        message.error("An unknown error occurred");
    }
    setToolActive('navigate', false);
  };

  const updateLocation = (position) => {
    if (!map || !active) return;

    const { coords } = position;
    const location = transform(
      [coords.longitude, coords.latitude],
      'EPSG:4326',
      map.getView().getProjection()
    );

    sourceRef.current.clear();
    const feature = new Feature({
      geometry: new Point(location)
    });
    sourceRef.current.addFeature(feature);

    // Center map on location if this is first position
    if (sourceRef.current.getFeatures().length === 1) {
      map.getView().animate({
        center: location,
        zoom: 15,
        duration: 1000
      });
    }
  };

  const toggleNavigation = () => {
    if (!map) return;
    setToolActive('navigate', !active);
  };

  if (!map) return null;

  return (
    <Tooltip title="Track your GPS location on the map">
      <Button
        type={active ? 'primary' : 'default'}
        icon={<CompassOutlined />}
        onClick={toggleNavigation}
        style={{ minWidth: '40px', width: '40px', height: '40px', padding: 0 }}
      />
    </Tooltip>
  );
};

export default NavigationTool;

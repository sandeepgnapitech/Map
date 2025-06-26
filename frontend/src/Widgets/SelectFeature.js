import React, { useEffect } from 'react';
import { Button, message, Tooltip } from 'antd';
import { SelectOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import { Select as OLSelect } from 'ol/interaction';
import VectorLayer from 'ol/layer/Vector';
import { Fill, Stroke, Style } from 'ol/style';
import { useTool } from './contexts/ToolContext';

/**
 * SelectFeature widget for selecting features on vector layers
 * @param {Object} props Component props
 * @param {import('ol').Map} props.map OpenLayers map instance
 * @returns {JSX.Element} Select feature button
 */
const SelectFeature = ({ map }) => {
  const { activeTool, setToolActive } = useTool();
  const active = activeTool === 'select';

  const selectStyle = new Style({
    fill: new Fill({
      color: 'rgba(0, 255, 255, 0.3)'
    }),
    stroke: new Stroke({
      color: 'rgba(0, 255, 255, 0.8)',
      width: 2
    })
  });

  useEffect(() => {
    if (!map) return;

    // Create select interaction
    const selectInteraction = new OLSelect({
      layers: (layer) => layer instanceof VectorLayer,
      style: selectStyle,
      multi: true,
      hitTolerance: 5
    });

    // Add or remove interaction based on active state
    if (active) {
      map.addInteraction(selectInteraction);
      map.getTargetElement().style.cursor = 'pointer';
      message.info('Select feature mode activated');
    } else {
      map.removeInteraction(selectInteraction);
      map.getTargetElement().style.cursor = 'default';
    }

    return () => {
      if (map) {
        map.removeInteraction(selectInteraction);
        map.getTargetElement().style.cursor = 'default';
      }
    };
  }, [map, active]);

  const toggleSelect = () => {
    if (!map) return;
    setToolActive('select', !active);
  };

  if (!map) return null;

  return (
    <Tooltip title="Select features on vector layers">
      <Button
        type={active ? 'primary' : 'default'}
        icon={<SelectOutlined />}
        onClick={toggleSelect}
        style={{ minWidth: '40px', width: '40px', height: '40px', padding: 0 }}
      />
    </Tooltip>
  );
};

SelectFeature.propTypes = {
  map: PropTypes.object.isRequired,
};

export default SelectFeature;

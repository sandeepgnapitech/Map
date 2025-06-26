import React, { useEffect, useState } from 'react';
import { Button, message, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import { click } from 'ol/events/condition';
import { Select as OLSelect } from 'ol/interaction';
import VectorLayer from 'ol/layer/Vector';
import Overlay from 'ol/Overlay';
import { Fill, Stroke, Style } from 'ol/style';
import { useTool } from './contexts/ToolContext';

/**
 * FeatureInfo widget for displaying information about clicked features
 * @param {Object} props Component props
 * @param {import('ol').Map} props.map OpenLayers map instance
 * @returns {JSX.Element} Feature info button
 */
const FeatureInfo = ({ map }) => {
  const { activeTool, setToolActive } = useTool();
  const active = activeTool === 'info';
  const [clickInteraction, setClickInteraction] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [container, setContainer] = useState(null);

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

    // Create popup container
    const popupContainer = document.createElement('div');
    popupContainer.style.position = 'fixed';
    popupContainer.style.top = '60px';  // Below the toolbar
    popupContainer.style.left = '20px';
    popupContainer.style.backgroundColor = 'white';
    popupContainer.style.padding = '15px';
    popupContainer.style.borderRadius = '4px';
    popupContainer.style.border = '1px solid #d9d9d9';
    popupContainer.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
    popupContainer.style.width = '300px';
    popupContainer.style.maxHeight = '400px';
    popupContainer.style.overflowY = 'auto';
    popupContainer.style.display = 'none';
    popupContainer.style.zIndex = '1000';
    popupContainer.style.userSelect = 'none';
    
    // Create header with drag handle
    const header = document.createElement('div');
    header.style.borderBottom = '1px solid #f0f0f0';
    header.style.marginBottom = '10px';
    header.style.paddingBottom = '10px';
    header.style.cursor = 'move';
    header.style.userSelect = 'none';
    header.innerHTML = '<strong>Feature Information</strong>';
    popupContainer.appendChild(header);

    // Create content container
    const content = document.createElement('div');
    content.style.userSelect = 'text';
    popupContainer.appendChild(content);

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let lastX = parseInt(popupContainer.style.left, 10) || 20;
    let lastY = parseInt(popupContainer.style.top, 10) || 60;

    const onMouseDown = (e) => {
      // Only start dragging from header
      if (e.target !== header && !header.contains(e.target)) return;

      isDragging = true;
      startX = e.clientX - lastX;
      startY = e.clientY - lastY;

      // Prevent text selection while dragging
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;

      const newX = e.clientX - startX;
      const newY = e.clientY - startY;

      // Keep popup within window bounds
      const maxX = window.innerWidth - popupContainer.offsetWidth;
      const maxY = window.innerHeight - popupContainer.offsetHeight;
      
      lastX = Math.min(Math.max(0, newX), maxX);
      lastY = Math.min(Math.max(0, newY), maxY);

      popupContainer.style.left = `${lastX}px`;
      popupContainer.style.top = `${lastY}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    header.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    document.body.appendChild(popupContainer);
    setContainer(popupContainer);

    // Create click interaction with selection style
    const interaction = new OLSelect({
      layers: (layer) => layer instanceof VectorLayer,
      condition: click,
      style: selectStyle,
      multi: false,
      hitTolerance: 5
    });

    interaction.on('select', (event) => {
      const selected = event.selected[0];
      if (selected) {
        const properties = selected.getProperties();
        const contentHtml = Object.entries(properties)
          .filter(([key]) => key !== 'geometry' && !key.startsWith('_'))
          .map(([key, value]) => `
            <div style="margin-bottom: 5px;">
              <strong style="color: #666;">${key}:</strong> 
              <span>${value}</span>
            </div>
          `)
          .join('');

        content.innerHTML = contentHtml;
        popupContainer.style.display = 'block';
      } else {
        popupContainer.style.display = 'none';
      }
    });

    setClickInteraction(interaction);

    // Cleanup
    return () => {
      if (interaction) {
        map.removeInteraction(interaction);
      }
      if (popupContainer && popupContainer.parentNode) {
        header.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        popupContainer.parentNode.removeChild(popupContainer);
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map || !clickInteraction) return;

    if (active) {
      map.addInteraction(clickInteraction);
      map.getTargetElement().style.cursor = 'help';
      message.info('Feature info mode activated');
    } else {
      if (container) {
        container.style.display = 'none';
      }
      clickInteraction.getFeatures().clear();
      map.removeInteraction(clickInteraction);
      map.getTargetElement().style.cursor = 'default';
    }

    return () => {
      if (map) {
        map.removeInteraction(clickInteraction);
        map.getTargetElement().style.cursor = 'default';
      }
    };
  }, [map, clickInteraction, active]);

  const toggleInfo = () => {
    if (!map || !clickInteraction) return;
    setToolActive('info', !active);
  };

  if (!map) return null;

  return (
    <Tooltip title="Get information about map features">
      <Button
        type={active ? 'primary' : 'default'}
        icon={<InfoCircleOutlined />}
        onClick={toggleInfo}
        style={{ minWidth: '40px', width: '40px', height: '40px', padding: 0 }}
      />
    </Tooltip>
  );
};

FeatureInfo.propTypes = {
  map: PropTypes.object.isRequired,
};

export default FeatureInfo;

import React, { useState, useEffect } from 'react';
import { Button, Modal, Select, InputNumber, message, Tooltip, Divider, Radio } from 'antd';
import { BgColorsOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import VectorLayer from 'ol/layer/Vector';
import { getGeometryType, getStyleForGeometry } from '../utils/geomUtils';
import PropTypes from 'prop-types';

const { Option } = Select;

const methodDescriptions = {
  equalInterval: "Divides the range of values into equal sized intervals. Best for evenly distributed data.",
  quantile: "Creates classes with equal number of features in each. Good for unevenly distributed data.",
  naturalBreaks: "Groups similar values and maximizes differences between classes. Best for clustered data."
};

const colorSchemes = {
  sequential: [
    ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'], // Reds
    ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'], // Greens
    ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'], // Blues
  ],
  diverging: [
    ['#d73027', '#fc8d59', '#fee090', '#91bfdb', '#4575b4'], // Red-Blue
    ['#8c510a', '#f6e8c3', '#f5f5f5', '#c7eae5', '#01665e'], // Brown-Teal
    ['#762a83', '#c2a5cf', '#f7f7f7', '#80cdc1', '#1b7837'], // Purple-Green
  ],
  qualitative: [
    ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00'], // Set 1
    ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854'], // Set 2
    ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3'], // Set 3
  ]
};

/**
 * Symbology component provides a widget for styling vector layers with different color schemes and classification methods.
 * Users can select layers, fields, color schemes, and classification parameters to create thematic maps.
 * @component
 * @param {Object} props - Component properties
 * @param {import('ol').Map} props.map - OpenLayers map instance
 * @returns {JSX.Element} Symbology widget component
 */
const Symbology = ({ map }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [vectorLayers, setVectorLayers] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [fields, setFields] = useState([]);
  const [classCount, setClassCount] = useState(5);
  const [currentStyle, setCurrentStyle] = useState(null);
  const [styleCache, setStyleCache] = useState(new Map());
  const [colorScheme, setColorScheme] = useState('sequential');
  const [classMethod, setClassMethod] = useState('equalInterval');
  const [selectedSchemeIndex, setSelectedSchemeIndex] = useState(0);
  const [geometryType, setGeometryType] = useState(null);
  const [styleOptions, setStyleOptions] = useState({
    pointSize: 8,
    lineWidth: 2,
    opacity: 0.5
  });

  const refreshVectorLayers = () => {
    if (!map) return;
    
    const layers = [];
    map.getLayers().forEach(layer => {
      if (layer instanceof VectorLayer && layer.get('title')) {
        layers.push(layer);
      }
    });
    setVectorLayers(layers);
  };

  useEffect(() => {
    if (!map) return;
    
    refreshVectorLayers();

    const layerGroup = map.getLayers();
    const handleLayerChange = () => {
      refreshVectorLayers();
    };

    layerGroup.on('add', handleLayerChange);
    layerGroup.on('remove', handleLayerChange);
    
    const layerListeners = [];
    layerGroup.forEach(layer => {
      const listener = layer.on('propertychange', handleLayerChange);
      layerListeners.push({ layer, listener });
    });

    return () => {
      layerGroup.un('add', handleLayerChange);
      layerGroup.un('remove', handleLayerChange);
      layerListeners.forEach(({ layer, listener }) => {
        if (layer) {
          layer.un('propertychange', listener);
        }
      });
    };
  }, [map]);

  useEffect(() => {
    if (!selectedLayer) {
      setFields([]);
      return;
    }

    const source = selectedLayer.getSource();
    const features = source.getFeatures();
    if (features.length === 0) {
      setFields([]);
      return;
    }

    const allFields = Object.keys(features[0].getProperties())
      .filter(key => key !== 'geometry' && typeof features[0].get(key) === 'number');
    
    setFields(allFields);
  }, [selectedLayer]);

  useEffect(() => {
    if (selectedLayer && styleCache.has(selectedLayer.get('title'))) {
      const cachedStyle = styleCache.get(selectedLayer.get('title'));
      selectedLayer.set('currentStyle', {
        field: cachedStyle.field,
        breaks: cachedStyle.breaks,
        colors: cachedStyle.colors
      });
    }
  }, [selectedLayer, styleCache]);

  const handleOpenModal = () => {
    setIsModalVisible(true);
  };

  const interpolateColors = (scheme, count) => {
    if (!scheme || !Array.isArray(scheme) || scheme.length === 0) {
      throw new Error('Invalid color scheme');
    }

    const colors = [];
    for (let i = 0; i < count; i++) {
      const index = (i / (count - 1)) * (scheme.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      
      if (lower === upper) {
        colors.push(scheme[lower]);
      } else {
        const fraction = index - lower;
        const lowerColor = scheme[lower].match(/\w\w/g).map(c => parseInt(c, 16));
        const upperColor = scheme[upper].match(/\w\w/g).map(c => parseInt(c, 16));
        const interpolated = lowerColor.map((c, i) => {
          const val = Math.round(c + (upperColor[i] - c) * fraction);
          return val.toString(16).padStart(2, '0');
        });
        colors.push('#' + interpolated.join(''));
      }
    }
    return colors;
  };

  const getColors = (schemeIndex = 0) => {
    const schemes = colorSchemes[colorScheme];
    if (!schemes || !Array.isArray(schemes) || schemeIndex >= schemes.length) {
      console.error('Invalid color scheme or index');
      return interpolateColors(colorSchemes.sequential[0], classCount); // Fallback to first sequential scheme
    }
    const scheme = schemes[schemeIndex];
    return interpolateColors(scheme, classCount);
  };

  const handleApplyStyle = (predefinedColors = null, closeOnSuccess = true) => {
    if (!selectedLayer || !selectedField) {
      message.error('Please select both layer and field');
      return;
    }

    const features = selectedLayer.getSource().getFeatures();
    const values = features.map(f => f.get(selectedField)).filter(v => v != null);
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    let breaks;

    switch (classMethod) {
      case 'equalInterval':
        const interval = (max - min) / classCount;
        breaks = Array.from({ length: classCount + 1 }, (_, i) => min + (interval * i));
        break;
      
      case 'quantile':
        const sortedValues = [...values].sort((a, b) => a - b);
        breaks = [min];
        for (let i = 1; i < classCount; i++) {
          const index = Math.round((i / classCount) * (sortedValues.length - 1));
          breaks.push(sortedValues[index]);
        }
        breaks.push(max);
        break;
      
      case 'naturalBreaks':
        breaks = [min];
        const step = (max - min) / (classCount * 2);
        for (let i = 1; i < classCount; i++) {
          breaks.push(min + (step * (i * 2 + 1)));
        }
        breaks.push(max);
        break;
      
      default:
        break;
    }

    try {
      const colors = predefinedColors || getColors(selectedSchemeIndex);

      selectedLayer.setStyle((feature) => {
        const value = feature.get(selectedField);
        let colorIndex = 0;
        
        for (let i = 0; i < breaks.length - 1; i++) {
          if (value >= breaks[i] && value <= breaks[i + 1]) {
            colorIndex = i;
            break;
          }
        }

        const color = colors[colorIndex];
        const { pointSize, lineWidth, opacity } = styleOptions;
        const opacityHex = Math.round(opacity * 255).toString(16).padStart(2, '0');

        const geomType = feature.getGeometry().getType();

        return getStyleForGeometry(geomType, color, {
          size: pointSize,
          width: lineWidth,
          opacity: opacityHex
        });
      });

      const styleInfo = {
        field: selectedField,
        breaks,
        colors,
        min,
        max
      };

      selectedLayer.set('currentStyle', styleInfo);
      setCurrentStyle(styleInfo);

      setStyleCache(prev => {
        const newCache = new Map(prev);
        newCache.set(selectedLayer.get('title'), {
          field: selectedField,
          classCount,
          classMethod,
          colorScheme,
          breaks,
          colors,
          schemeIndex: selectedSchemeIndex,
          styleOptions,
          geometryType
        });
        return newCache;
      });

      message.success('Style applied successfully');
      if (closeOnSuccess) {
        setIsModalVisible(false);
      }
    } catch (error) {
      console.error('Error applying style:', error);
      message.error('Failed to apply style');
    }
  };

  if (!map) return null;

  return (
    <>
      <Tooltip title="Style vector layers">
        <Button
          icon={<BgColorsOutlined />}
          onClick={handleOpenModal}
          style={{ minWidth: '40px', width: '40px', height: '40px', padding: 0 }}
        />
      </Tooltip>

      <Modal
        title="Layer Symbology"
        open={isModalVisible}
        draggable
        modalRender={modal => modal}
        dragHandle=".ant-modal-header"
        onOk={() => handleApplyStyle(null, true)}
        onCancel={() => setIsModalVisible(false)}
        okButtonProps={{
          disabled: !selectedLayer || !selectedField || fields.length === 0
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <label>
            Select Layer
            <Tooltip title="Choose a vector layer to style">
              <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
            </Tooltip>
          </label>
          <Select
            style={{ width: '100%', marginTop: 8 }}
            value={selectedLayer?.get('title')}
            onChange={(title) => {
              const layer = vectorLayers.find(l => l.get('title') === title);
              setSelectedLayer(layer);
              
              // Detect geometry type
              const type = getGeometryType(layer);
              setGeometryType(type);
              
              const cachedStyle = styleCache.get(title);
              if (cachedStyle) {
                setSelectedField(cachedStyle.field);
                setClassCount(cachedStyle.classCount);
                setClassMethod(cachedStyle.classMethod);
                setColorScheme(cachedStyle.colorScheme);
                setSelectedSchemeIndex(cachedStyle.schemeIndex || 0);
                setStyleOptions(cachedStyle.styleOptions || {
                  pointSize: 8,
                  lineWidth: 2,
                  opacity: 0.5
                });
                setCurrentStyle({
                  field: cachedStyle.field,
                  breaks: cachedStyle.breaks,
                  colors: cachedStyle.colors
                });
              } else {
                setSelectedField(null);
                setCurrentStyle(null);
                setSelectedSchemeIndex(0);
                setStyleOptions({
                  pointSize: 8,
                  lineWidth: 2,
                  opacity: 0.5
                });
              }
            }}
            getPopupContainer={trigger => trigger.parentNode}
          >
            {vectorLayers.map(layer => (
              <Option key={layer.get('title')} value={layer.get('title')}>
                {layer.get('title')}
              </Option>
            ))}
          </Select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>
            Select Field
            <Tooltip title="Choose a numeric field to use for styling">
              <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
            </Tooltip>
          </label>
          <Select
            style={{ width: '100%', marginTop: 8 }}
            value={selectedField}
            onChange={(value) => {
              setSelectedField(value);
              setSelectedSchemeIndex(0); // Reset scheme index when field changes
            }}
            disabled={fields.length === 0}
            placeholder={fields.length === 0 ? "Selected layer has no numeric fields" : "Select a field"}
            getPopupContainer={trigger => trigger.parentNode}
          >
            {fields.map(field => (
              <Option key={field} value={field}>
                {field}
              </Option>
            ))}
          </Select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>
            Number of Classes
            <Tooltip title="More classes show more detail but can be harder to read. 5-7 classes is typically optimal.">
              <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
            </Tooltip>
          </label>
          <InputNumber
            style={{ width: '100%', marginTop: 8 }}
            min={2}
            max={10}
            value={classCount}
            onChange={setClassCount}
            disabled={!selectedField}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>
            Classification Method
            <Tooltip title="How to divide your data into classes">
              <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
            </Tooltip>
          </label>
          <Select
            style={{ width: '100%', marginTop: 8 }}
            value={classMethod}
            onChange={setClassMethod}
            disabled={!selectedField}
            getPopupContainer={trigger => trigger.parentNode}
          >
            {Object.entries(methodDescriptions).map(([method, description]) => (
              <Option key={method} value={method}>
                <Tooltip title={description} placement="right">
                  <span>{method.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                </Tooltip>
              </Option>
            ))}
          </Select>
        </div>

        {/* Geometry-specific style options */}
        {selectedLayer && (
          <div style={{ marginBottom: 16 }}>
            <label>
              Style Options
              <Tooltip title="Customize the appearance based on geometry type">
                <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
              </Tooltip>
            </label>
            <div style={{ marginTop: 8 }}>
              {(geometryType === 'Point' || geometryType === 'Mixed') && (
                <div style={{ marginBottom: 8 }}>
                  <label>Point Size</label>
                  <InputNumber
                    min={2}
                    max={20}
                    value={styleOptions.pointSize}
                    onChange={(value) => setStyleOptions(prev => ({ ...prev, pointSize: value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
              {(geometryType === 'LineString' || geometryType === 'Mixed') && (
                <div style={{ marginBottom: 8 }}>
                  <label>Line Width</label>
                  <InputNumber
                    min={1}
                    max={10}
                    value={styleOptions.lineWidth}
                    onChange={(value) => setStyleOptions(prev => ({ ...prev, lineWidth: value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
              <div>
                <label>Opacity</label>
                <InputNumber
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={styleOptions.opacity}
                  onChange={(value) => setStyleOptions(prev => ({ ...prev, opacity: value }))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label>
            Color Scheme
            <Tooltip title="Choose a color scheme appropriate for your data type">
              <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
            </Tooltip>
          </label>
          <Radio.Group
            value={colorScheme}
            onChange={(e) => {
              setColorScheme(e.target.value);
              setSelectedSchemeIndex(0); // Reset scheme index when scheme type changes
            }}
            disabled={!selectedField}
            style={{ width: '100%', marginTop: 8 }}
          >
            <Tooltip title="Best for ordered data (low to high values)">
              <Radio.Button value="sequential">Sequential</Radio.Button>
            </Tooltip>
            <Tooltip title="Best for data with a meaningful center point">
              <Radio.Button value="diverging">Diverging</Radio.Button>
            </Tooltip>
            <Tooltip title="Best for categorical data">
              <Radio.Button value="qualitative">Qualitative</Radio.Button>
            </Tooltip>
          </Radio.Group>

          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {colorSchemes[colorScheme].map((scheme, i) => (
              <Tooltip 
                key={i}
                title={!selectedField ? 'Select a field first' : 'Click to apply this color scheme'}
              >
                <div 
                  style={{ 
                    display: 'flex', 
                    height: 24, 
                    border: `1px solid ${selectedSchemeIndex === i ? '#1890ff' : '#d9d9d9'}`,
                    borderRadius: 4,
                    overflow: 'hidden',
                    cursor: !selectedField ? 'not-allowed' : 'pointer',
                    opacity: !selectedField ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                    transform: 'scale(1)',
                    boxShadow: selectedSchemeIndex === i ? '0 0 0 2px rgba(24,144,255,0.2)' : '0 0 0 rgba(0,0,0,0)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedField) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSchemeIndex !== i) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 0 0 rgba(0,0,0,0)';
                    } else {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24,144,255,0.2)';
                    }
                  }}
                  onClick={() => {
                    if (selectedField && selectedLayer) {
                      setSelectedSchemeIndex(i);
                      handleApplyStyle(interpolateColors(scheme, classCount), false);
                    }
                  }}
                >
                  {scheme.map((color, j) => (
                    <div
                      key={j}
                      style={{
                        flex: 1,
                        backgroundColor: color
                      }}
                    />
                  ))}
                </div>
              </Tooltip>
            ))}
          </div>
        </div>

        {currentStyle && fields.length > 0 && (
          <>
            <Divider />
            <div>
              <h4>Legend - {currentStyle.field}</h4>
              <div style={{ marginTop: 8 }}>
                {currentStyle.breaks.slice(0, -1).map((breakValue, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    {geometryType === 'Point' ? (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 8,
                        }}
                      >
                        <div
                          style={{
                            width: styleOptions.pointSize,
                            height: styleOptions.pointSize,
                            borderRadius: '50%',
                            backgroundColor: currentStyle.colors[index] + Math.round(styleOptions.opacity * 255).toString(16).padStart(2, '0'),
                            border: `1px solid ${currentStyle.colors[index]}`
                          }}
                        />
                      </div>
                    ) : geometryType === 'LineString' ? (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          marginRight: 8,
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: styleOptions.lineWidth,
                            backgroundColor: currentStyle.colors[index]
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          backgroundColor: currentStyle.colors[index] + Math.round(styleOptions.opacity * 255).toString(16).padStart(2, '0'),
                          marginRight: 8,
                          border: `1px solid ${currentStyle.colors[index]}`
                        }}
                      />
                    )}
                    <span>
                      {breakValue.toFixed(2)} - {currentStyle.breaks[index + 1].toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

Symbology.propTypes = {
  map: PropTypes.object.isRequired,
};

export default Symbology;

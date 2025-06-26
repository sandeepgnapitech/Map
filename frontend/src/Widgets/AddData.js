import React, { useState } from 'react';
import { Form, Input, Select, Button, message, Modal, Tooltip } from 'antd';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import TileWMS from 'ol/source/TileWMS';
import ImageWMS from 'ol/source/ImageWMS';
import VectorSource from 'ol/source/Vector';
import EsriJSON from 'ol/format/EsriJSON';
import { GeoJSON } from 'ol/format';
import { transformExtent } from 'ol/proj';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';

const { Option } = Select;

/**
 * AddData widget for adding various layer types to the map
 * @param {Object} props Component props
 * @param {import('ol').Map} props.map OpenLayers map instance
 * @returns {JSX.Element} Add data panel
 */
const AddData = ({ map }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentLayerType, setCurrentLayerType] = useState('wms');

  const showModal = () => {
    setIsModalVisible(true);
    setCurrentLayerType('wms');
    form.resetFields();
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setCurrentLayerType('wms');
  };

  const layerTypeFields = {
    wms: [
      { name: 'url', label: 'WMS URL', required: true },
      { name: 'layers', label: 'Layer Names', required: true },
    ],
    wfs: [
      { name: 'url', label: 'WFS URL', required: true },
      { name: 'typeName', label: 'Type Name', required: true },
    ],
    esri: [
      { name: 'url', label: 'Feature Service URL', required: true },
      { name: 'layer', label: 'Layer ID', required: true },
    ],
  };

  const handleLayerTypeChange = (value) => {

    setCurrentLayerType(value);
    const currentName = form.getFieldValue('name');
    
    // Reset all fields except name
    form.resetFields(['url', 'layers', 'typeName', 'layer']);
    
    // Restore name and set new layer type
    form.setFieldsValue({
      name: currentName,
      layerType: value
    });
  };

  const createWMSLayer = (values) => {
    const source = new TileWMS({
      url: values.url,
      params: {
        'LAYERS': values.layers,
        'FORMAT': 'image/png',
        'TRANSPARENT': true,
      },
      crossOrigin: 'anonymous',
    });

    return new TileLayer({
      source: source,
      title: values.name || values.layers,
      overlay: true,
    });
  };

  const createWFSLayer = async (values) => {
    const url = new URL(values.url);
    url.searchParams.set('service', 'WFS');
    url.searchParams.set('version', '2.0.0');
    url.searchParams.set('request', 'GetFeature');
    url.searchParams.set('typeName', values.typeName);
    url.searchParams.set('outputFormat', 'application/json');

    const response = await fetch(url);
    const geojson = await response.json();
    const features = new GeoJSON().readFeatures(geojson, {
      featureProjection: map.getView().getProjection(),
    });

    return new VectorLayer({
      source: new VectorSource({
        features: features,
      }),
      title: values.name || values.typeName,
      overlay: true,
    });
  };

  const createEsriFeatureLayer = async (values) => {
    const url = `${values.url}/${values.layer}/query`;
    const params = new URLSearchParams({
      f: 'json',
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();
    const features = new EsriJSON().readFeatures(data, {
      featureProjection: map.getView().getProjection(),
    });

    return new VectorLayer({
      source: new VectorSource({
        features: features,
      }),
      title: values.name || `Layer ${values.layer}`,
      overlay: true,
    });
  };

  const zoomToLayer = (layer) => {
    // Attempt to get the layer's extent
    let extent;

    if (layer instanceof VectorLayer) {
      // For vector layers, get extent from features
      extent = layer.getSource().getExtent();
      if (extent && !extent.every(coord => coord === Infinity || coord === -Infinity)) {
        map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 1000,
          maxZoom: 16
        });
      }
    } else if (layer instanceof TileLayer) {
      try {
        // For WMS layers, try to get extent from source capabilities
        const source = layer.getSource();
        if (source instanceof TileWMS) {
          // Start loading tiles which will help determine extent
          source.refresh();
          // Wait a bit for tiles to start loading
          setTimeout(() => {
            const tileGrid = source.getTileGrid();
            if (tileGrid) {
              extent = tileGrid.getExtent();
              if (extent) {
                map.getView().fit(extent, {
                  padding: [50, 50, 50, 50],
                  duration: 1000,
                  maxZoom: 16
                });
              }
            }
          }, 500);
        }
      } catch (error) {
        console.warn('Could not zoom to WMS layer extent:', error);
      }
    }
  };

  const handleSubmit = async (values) => {
    if (!map) return;

    setLoading(true);
    try {
      let layer;

      switch (values.layerType) {
        case 'wms':
          layer = createWMSLayer(values);
          break;
        case 'wfs':
          layer = await createWFSLayer(values);
          break;
        case 'esri':
          layer = await createEsriFeatureLayer(values);
          break;
        default:
          throw new Error('Unsupported layer type');
      }

      map.addLayer(layer);
      
      // Zoom to layer extent
      zoomToLayer(layer);

      message.success(`Added ${values.name || 'layer'} successfully`);
      setIsModalVisible(false);
      form.resetFields();
      setCurrentLayerType('wms');
    } catch (error) {
      console.error('Error adding layer:', error);
      message.error('Failed to add layer: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!map) return null;

  return (
    <div>
      <Tooltip title="Add new map layer">
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={showModal}
          style={{  minWidth: '40px', width: '40px', height: '40px', padding: 0 }}
        />
      </Tooltip>

      <Modal
        title="Add Layer"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ layerType: 'wms' }}
        >
          <Form.Item
            name="name"
            label="Layer Name"
            rules={[{ required: true, message: 'Please enter a layer name' }]}
          >
            <Input placeholder="Enter layer name" />
          </Form.Item>

          <Form.Item
            name="layerType"
            label="Layer Type"
            rules={[{ required: true }]}
          >
            <Select onChange={handleLayerTypeChange} getPopupContainer={trigger => trigger.parentNode}>
              <Option value="wms">WMS</Option>
              <Option value="wfs">WFS</Option>
              <Option value="esri">ESRI Feature Service</Option>
            </Select>
          </Form.Item>

          {layerTypeFields[currentLayerType].map(field => (
            <Form.Item
              key={field.name}
              name={field.name}
              label={field.label}
              rules={[
                { 
                  required: field.required, 
                  message: `Please enter the ${field.label}` 
                }
              ]}
            >
              <Input placeholder={`Enter ${field.label.toLowerCase()}`} />
            </Form.Item>
          ))}

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              disabled={loading}
              block
            >
              {loading ? <LoadingOutlined /> : 'Add Layer'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AddData;

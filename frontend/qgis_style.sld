<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" 
    xmlns="http://www.opengis.net/sld" 
    xmlns:ogc="http://www.opengis.net/ogc"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
    
    <NamedLayer>
        <Name>planet_osm_polygon</Name>
        <UserStyle>
            <Name>OSM Bright Style</Name>
            <FeatureTypeStyle>
                <!-- All previous rules remain the same until the label section -->
                
                <!-- Water Bodies -->
                <Rule>
                    <Name>Water</Name>
                    <ogc:Filter>
                        <ogc:Or>
                            <ogc:PropertyIsEqualTo>
                                <ogc:PropertyName>water</ogc:PropertyName>
                                <ogc:Literal>water</ogc:Literal>
                            </ogc:PropertyIsEqualTo>
                            <ogc:PropertyIsEqualTo>
                                <ogc:PropertyName>waterway</ogc:PropertyName>
                                <ogc:Literal>riverbank</ogc:Literal>
                            </ogc:PropertyIsEqualTo>
                            <ogc:PropertyIsEqualTo>
                                <ogc:PropertyName>natural</ogc:PropertyName>
                                <ogc:Literal>water</ogc:Literal>
                            </ogc:PropertyIsEqualTo>
                        </ogc:Or>
                    </ogc:Filter>
                    <PolygonSymbolizer>
                        <Fill>
                            <CssParameter name="fill">#a0c8f0</CssParameter>
                        </Fill>
                    </PolygonSymbolizer>
                </Rule>

                <!-- Landuse - Residential -->
                <Rule>
                    <Name>Residential Areas</Name>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>landuse</ogc:PropertyName>
                            <ogc:Literal>residential</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <PolygonSymbolizer>
                        <Fill>
                            <CssParameter name="fill">#e0dfdf</CssParameter>
                            <CssParameter name="fill-opacity">0.4</CssParameter>
                        </Fill>
                    </PolygonSymbolizer>
                </Rule>

                <!-- Parks and Recreation -->
                <Rule>
                    <Name>Parks</Name>
                    <ogc:Filter>
                        <ogc:Or>
                            <ogc:PropertyIsEqualTo>
                                <ogc:PropertyName>leisure</ogc:PropertyName>
                                <ogc:Literal>park</ogc:Literal>
                            </ogc:PropertyIsEqualTo>
                            <ogc:PropertyIsEqualTo>
                                <ogc:PropertyName>landuse</ogc:PropertyName>
                                <ogc:Literal>recreation_ground</ogc:Literal>
                            </ogc:PropertyIsEqualTo>
                        </ogc:Or>
                    </ogc:Filter>
                    <PolygonSymbolizer>
                        <Fill>
                            <CssParameter name="fill">#d8e8c8</CssParameter>
                            <CssParameter name="fill-opacity">0.8</CssParameter>
                        </Fill>
                    </PolygonSymbolizer>
                </Rule>

                <!-- Natural - Wood -->
                <Rule>
                    <Name>Forest/Wood</Name>
                    <ogc:Filter>
                        <ogc:Or>
                            <ogc:PropertyIsEqualTo>
                                <ogc:PropertyName>natural</ogc:PropertyName>
                                <ogc:Literal>wood</ogc:Literal>
                            </ogc:PropertyIsEqualTo>
                            <ogc:PropertyIsEqualTo>
                                <ogc:PropertyName>landuse</ogc:PropertyName>
                                <ogc:Literal>forest</ogc:Literal>
                            </ogc:PropertyIsEqualTo>
                        </ogc:Or>
                    </ogc:Filter>
                    <PolygonSymbolizer>
                        <Fill>
                            <CssParameter name="fill">#66aa44</CssParameter>
                            <CssParameter name="fill-opacity">0.1</CssParameter>
                        </Fill>
                    </PolygonSymbolizer>
                </Rule>

                <!-- Buildings -->
                <Rule>
                    <Name>Buildings</Name>
                    <ogc:Filter>
                        <ogc:Not>
                            <ogc:PropertyIsNull>
                                <ogc:PropertyName>building</ogc:PropertyName>
                            </ogc:PropertyIsNull>
                        </ogc:Not>
                    </ogc:Filter>
                    <MinScaleDenominator>1000</MinScaleDenominator>
                    <MaxScaleDenominator>50000</MaxScaleDenominator>
                    <PolygonSymbolizer>
                        <Fill>
                            <CssParameter name="fill">#f2eae2</CssParameter>
                        </Fill>
                        <Stroke>
                            <CssParameter name="stroke">#dfdbd7</CssParameter>
                            <CssParameter name="stroke-width">0.5</CssParameter>
                        </Stroke>
                    </PolygonSymbolizer>
                </Rule>

                <!-- Labels for Areas -->
                <Rule>
                    <Name>Area Labels</Name>
                    <ogc:Filter>
                        <ogc:Or>
                            <ogc:PropertyIsEqualTo>
                                <ogc:PropertyName>landuse</ogc:PropertyName>
                                <ogc:Literal>residential</ogc:Literal>
                            </ogc:PropertyIsEqualTo>
                            <ogc:PropertyIsEqualTo>
                                <ogc:PropertyName>landuse</ogc:PropertyName>
                                <ogc:Literal>commercial</ogc:Literal>
                            </ogc:PropertyIsEqualTo>
                        </ogc:Or>
                    </ogc:Filter>
                    <TextSymbolizer>
                        <Label>
                            <ogc:PropertyName>name</ogc:PropertyName>
                        </Label>
                        <Font>
                            <CssParameter name="font-family">Arial</CssParameter>
                            <CssParameter name="font-size">11</CssParameter>
                            <CssParameter name="font-style">normal</CssParameter>
                        </Font>
                        <LabelPlacement>
                            <PointPlacement>
                                <AnchorPoint>
                                    <AnchorPointX>0.5</AnchorPointX>
                                    <AnchorPointY>0.5</AnchorPointY>
                                </AnchorPoint>
                            </PointPlacement>
                        </LabelPlacement>
                        <Fill>
                            <CssParameter name="fill">#666666</CssParameter>
                        </Fill>
                        <Halo>
                            <Radius>1</Radius>
                            <Fill>
                                <CssParameter name="fill">#ffffff</CssParameter>
                            </Fill>
                        </Halo>
                        <VendorOption name="autoWrap">60</VendorOption>
                        <VendorOption name="maxDisplacement">150</VendorOption>
                        <VendorOption name="spaceAround">15</VendorOption>
                    </TextSymbolizer>
                </Rule>
            </FeatureTypeStyle>
        </UserStyle>
    </NamedLayer>
</StyledLayerDescriptor>

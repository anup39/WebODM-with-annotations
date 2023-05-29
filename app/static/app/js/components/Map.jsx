import React from "react";
import ReactDOM from "ReactDOM";
import "../css/Map.scss";
import "leaflet/dist/leaflet.css";
import Leaflet from "leaflet";
import async from "async";
import "../vendor/leaflet/L.Control.MousePosition.css";
import "../vendor/leaflet/L.Control.MousePosition";
import "../vendor/leaflet/Leaflet.Autolayers/css/leaflet.auto-layers.css";
import "../vendor/leaflet/Leaflet.Autolayers/leaflet-autolayers";
// import '../vendor/leaflet/L.TileLayer.NoGap';
import Dropzone from "../vendor/dropzone";
import $ from "jquery";
import ErrorMessage from "./ErrorMessage";
import ImagePopup from "./ImagePopup";
import GCPPopup from "./GCPPopup";
import SwitchModeButton from "./SwitchModeButton";
import ShareButton from "./ShareButton";
import AssetDownloads from "../classes/AssetDownloads";
import { addTempLayer } from "../classes/TempLayer";
import PropTypes from "prop-types";
import PluginsAPI from "../classes/plugins/API";
import Basemaps from "../classes/Basemaps";
import Standby from "./Standby";
import LayersControl from "./LayersControl";
import LayersControlMeasuring from "./LayersControlMeasuring";
import update from "immutability-helper";
import Utils from "../classes/Utils";
import "../vendor/leaflet/Leaflet.Ajax";
import "rbush";
import "../vendor/leaflet/leaflet-markers-canvas";
import { _ } from "../classes/gettext";

// # ADDED BY ME
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import mapPopupGenerator from "./MapPopupGenerator";

const geojson1 = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-4.662391, 36.522684],
        [-4.662407, 36.522821],
        [-4.662212, 36.52282],
        [-4.662221, 36.522578],
        [-4.662391, 36.522684],
      ],
    ],
  },
};

// GeoJSON object 2
const geojson2 = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-4.663391, 36.523684],
        [-4.663407, 36.523821],
        [-4.663212, 36.52382],
        [-4.663221, 36.523578],
        [-4.663391, 36.523684],
      ],
    ],
  },
};

const geojson3 = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-4.66205, 36.522263],
        [-4.661846, 36.522525],
        [-4.661736, 36.522351],
        [-4.661797, 36.522196],
        [-4.661797, 36.522196],
        [-4.66205, 36.522263],
      ],
    ],
  },
};

const geojson_lake_api = {
  type: "FeatureCollection",
  features: [geojson3],
};

const geojson_grass_api = {
  type: "FeatureCollection",
  features: [geojson1, geojson2],
};

class Map extends React.Component {
  static defaultProps = {
    showBackground: false,
    mapType: "orthophoto",
    public: false,
    shareButtons: true,
  };

  static propTypes = {
    showBackground: PropTypes.bool,
    tiles: PropTypes.array.isRequired,
    mapType: PropTypes.oneOf(["orthophoto", "plant", "dsm", "dtm"]),
    public: PropTypes.bool,
    shareButtons: PropTypes.bool,
  };

  constructor(props) {
    super(props);

    this.state = {
      error: "",
      singleTask: null, // When this is set to a task, show a switch mode button to view the 3d model
      pluginActionButtons: [],
      showLoading: false, // for drag&drop of files and first load
      opacity: 100,
      imageryLayers: [],
      overlays: [],
      drawMode: false,
      overlays_measuring: [],
    };

    this.basemaps = {};
    this.mapBounds = null;
    this.autolayers = null;
    this.addedCameraShots = false;

    this.loadImageryLayers = this.loadImageryLayers.bind(this);
    this.loadOverlayaMeasuring = this.loadOverlayaMeasuring.bind(this);
    this.updatePopupFor = this.updatePopupFor.bind(this);
    this.handleMapMouseDown = this.handleMapMouseDown.bind(this);
  }

  updateOpacity = (evt) => {
    this.setState({
      opacity: parseFloat(evt.target.value),
    });
  };

  updatePopupFor(layer) {
    const popup = layer.getPopup();
    $("#layerOpacity", popup.getContent()).val(layer.options.opacity);
  }

  typeToHuman = (type) => {
    switch (type) {
      case "orthophoto":
        return _("Orthophoto");
      case "plant":
        return _("Plant Health");
      case "dsm":
        return _("DSM");
      case "dtm":
        return _("DTM");
    }
    return "";
  };

  loadOverlayaMeasuring = (forceAddLayers = false) => {
    const project_id = this.props.project_id
    console.log(project_id, "project id")
    // Check if the name already exists in the state
    const grassIndex = this.state.overlays_measuring.findIndex(
      (layer) => layer[Symbol.for("meta")].name === "Grass"
    );
    const lakeIndex = this.state.overlays_measuring.findIndex(
      (layer) => layer[Symbol.for("meta")].name === "Lake"
    );

    // Create new GeoJSON layers
    const geojsonLayer_grass = L.geoJSON(geojson_grass_api);
    geojsonLayer_grass[Symbol.for("meta")] = {
      name: "Grass",
      icon: "fa fa-tree fa-fw",
    };

    const geojsonLayer_lake = L.geoJSON(geojson_lake_api);
    geojsonLayer_lake[Symbol.for("meta")] = {
      name: "Lake",
      icon: "fa fa-home fa-fw",
    };

    // Remove existing layers from the map
    if (grassIndex !== -1) {
      const existingGrassLayer = this.state.overlays_measuring[grassIndex];
      existingGrassLayer.removeFrom(this.map);
    }
    if (lakeIndex !== -1) {
      const existingLakeLayer = this.state.overlays_measuring[lakeIndex];
      existingLakeLayer.removeFrom(this.map);
    }

    // Update the state based on the name existence
    if (grassIndex !== -1 && lakeIndex !== -1) {
      this.setState(
        update(this.state, {
          overlays_measuring: {
            [grassIndex]: { $set: geojsonLayer_grass },
            [lakeIndex]: { $set: geojsonLayer_lake },
          },
        })
      );
    } else {
      this.setState(
        update(this.state, {
          overlays_measuring: {
            $push: [geojsonLayer_grass, geojsonLayer_lake],
          },
        })
      );
    }
  };

  loadImageryLayers(forceAddLayers = false) {
    // Cancel previous requests
    if (this.tileJsonRequests) {
      this.tileJsonRequests.forEach((tileJsonRequest) =>
        tileJsonRequest.abort()
      );
      this.tileJsonRequests = [];
    }

    const { tiles } = this.props;
    const layerId = (layer) => {
      const meta = layer[Symbol.for("meta")];
      return meta.task.project + "_" + meta.task.id;
    };

    // Remove all previous imagery layers
    // and keep track of which ones were selected

    const prevSelectedLayers = [];

    this.state.imageryLayers.forEach((layer) => {
      if (this.map.hasLayer(layer)) prevSelectedLayers.push(layerId(layer));
      layer.remove();
    });

    this.setState({ imageryLayers: [] });

    // Request new tiles
    return new Promise((resolve, reject) => {
      this.tileJsonRequests = [];

      async.each(
        tiles,
        (tile, done) => {
          const { url, meta, type } = tile;

          let metaUrl = url + "metadata";

          if (type == "plant")
            metaUrl += "?formula=NDVI&bands=RGN&color_map=rdylgn";
          if (type == "dsm" || type == "dtm")
            metaUrl += "?hillshade=6&color_map=viridis";

          this.tileJsonRequests.push(
            $.getJSON(metaUrl)
              .done((mres) => {
                const { scheme, name, maxzoom, statistics } = mres;

                const bounds = Leaflet.latLngBounds([
                  mres.bounds.value.slice(0, 2).reverse(),
                  mres.bounds.value.slice(2, 4).reverse(),
                ]);

                // Build URL
                let tileUrl = mres.tiles[0];
                const TILESIZE = 512;

                // Set rescale
                if (statistics) {
                  const params = Utils.queryParams({
                    search: tileUrl.slice(tileUrl.indexOf("?")),
                  });
                  if (statistics["1"]) {
                    // Add rescale
                    params["rescale"] = encodeURIComponent(
                      `${statistics["1"]["min"]},${statistics["1"]["max"]}`
                    );
                  } else {
                    console.warn(
                      "Cannot find min/max statistics for dataset, setting to -1,1"
                    );
                    params["rescale"] = encodeURIComponent("-1,1");
                  }

                  params["size"] = TILESIZE;
                  tileUrl = Utils.buildUrlWithQuery(tileUrl, params);
                } else {
                  tileUrl = Utils.buildUrlWithQuery(tileUrl, {
                    size: TILESIZE,
                  });
                }

                const layer = Leaflet.tileLayer(tileUrl, {
                  bounds,
                  minZoom: 0,
                  maxZoom: maxzoom + 99,
                  maxNativeZoom: maxzoom - 1,
                  tileSize: TILESIZE,
                  tms: scheme === "tms",
                  opacity: this.state.opacity / 100,
                  detectRetina: true,
                });

                // Associate metadata with this layer
                meta.name = name + ` (${this.typeToHuman(type)})`;
                meta.metaUrl = metaUrl;
                layer[Symbol.for("meta")] = meta;
                layer[Symbol.for("tile-meta")] = mres;

                if (
                  forceAddLayers ||
                  prevSelectedLayers.indexOf(layerId(layer)) !== -1
                ) {
                  layer.addTo(this.map);
                }

                // Show 3D switch button only if we have a single orthophoto
                if (tiles.length === 1) {
                  this.setState({ singleTask: meta.task });
                }

                // For some reason, getLatLng is not defined for tileLayer?
                // We need this function if other code calls layer.openPopup()
                let self = this;
                layer.getLatLng = function () {
                  let latlng = self.lastClickedLatLng
                    ? self.lastClickedLatLng
                    : this.options.bounds.getCenter();
                  return latlng;
                };

                var popup = L.DomUtil.create("div", "infoWindow");

                popup.innerHTML = `<div class="title">
                                    ${name}
                                </div>
                                <div class="popup-opacity-slider">Opacity: <input id="layerOpacity" type="range" value="${layer.options.opacity
                  }" min="0" max="1" step="0.01" /></div>
                                <div>Bounds: [${layer.options.bounds
                    .toBBoxString()
                    .split(",")
                    .join(", ")}]</div>
                                <ul class="asset-links loading">
                                    <li><i class="fa fa-spin fa-sync fa-spin fa-fw"></i></li>
                                </ul>

                                <button
                                    onclick="location.href='/3d/project/${meta.task.project
                  }/task/${meta.task.id}/';"
                                    type="button"
                                    class="switchModeButton btn btn-sm btn-secondary">
                                    <i class="fa fa-cube"></i> 3D
                                </button>`;

                layer.bindPopup(popup);

                $("#layerOpacity", popup).on("change input", function () {
                  layer.setOpacity($("#layerOpacity", popup).val());
                });

                this.setState(
                  update(this.state, {
                    imageryLayers: { $push: [layer] },
                  })
                );

                let mapBounds = this.mapBounds || Leaflet.latLngBounds();
                mapBounds.extend(bounds);
                this.mapBounds = mapBounds;

                // Add camera shots layer if available
                if (
                  meta.task &&
                  meta.task.camera_shots &&
                  !this.addedCameraShots
                ) {
                  var camIcon = L.icon({
                    iconUrl: "/static/app/js/icons/marker-camera.png",
                    iconSize: [41, 46],
                    iconAnchor: [17, 46],
                  });

                  const shotsLayer = new L.MarkersCanvas();
                  $.getJSON(meta.task.camera_shots).done((shots) => {
                    if (shots.type === "FeatureCollection") {
                      let markers = [];

                      shots.features.forEach((s) => {
                        let marker = L.marker(
                          [
                            s.geometry.coordinates[1],
                            s.geometry.coordinates[0],
                          ],
                          { icon: camIcon }
                        );
                        markers.push(marker);

                        if (s.properties && s.properties.filename) {
                          let root = null;
                          const lazyrender = () => {
                            if (!root) root = document.createElement("div");
                            ReactDOM.render(
                              <ImagePopup task={meta.task} feature={s} />,
                              root
                            );
                            return root;
                          };

                          marker.bindPopup(
                            L.popup({
                              lazyrender,
                              maxHeight: 450,
                              minWidth: 320,
                            })
                          );
                        }
                      });

                      shotsLayer.addMarkers(markers, this.map);
                    }
                  });
                  shotsLayer[Symbol.for("meta")] = {
                    name: name + " " + _("(Cameras)"),
                    icon: "fa fa-camera fa-fw",
                  };

                  this.setState(
                    update(this.state, {
                      overlays: { $push: [shotsLayer] },
                    })
                  );

                  this.addedCameraShots = true;
                }

                // Add ground control points layer if available
                if (
                  meta.task &&
                  meta.task.ground_control_points &&
                  !this.addedGroundControlPoints
                ) {
                  const gcpIcon = L.icon({
                    iconUrl: "/static/app/js/icons/marker-gcp.png",
                    iconSize: [41, 46],
                    iconAnchor: [17, 46],
                  });

                  const gcpLayer = new L.MarkersCanvas();
                  $.getJSON(meta.task.ground_control_points).done((gcps) => {
                    if (gcps.type === "FeatureCollection") {
                      let markers = [];

                      gcps.features.forEach((gcp) => {
                        let marker = L.marker(
                          [
                            gcp.geometry.coordinates[1],
                            gcp.geometry.coordinates[0],
                          ],
                          { icon: gcpIcon }
                        );
                        markers.push(marker);

                        if (gcp.properties && gcp.properties.observations) {
                          let root = null;
                          const lazyrender = () => {
                            if (!root) root = document.createElement("div");
                            ReactDOM.render(
                              <GCPPopup task={meta.task} feature={gcp} />,
                              root
                            );
                            return root;
                          };

                          marker.bindPopup(
                            L.popup({
                              lazyrender,
                              maxHeight: 450,
                              minWidth: 320,
                            })
                          );
                        }
                      });

                      gcpLayer.addMarkers(markers, this.map);
                    }
                  });
                  gcpLayer[Symbol.for("meta")] = {
                    name: name + " " + _("(GCPs)"),
                    icon: "far fa-dot-circle fa-fw",
                  };

                  this.setState(
                    update(this.state, {
                      overlays: { $push: [gcpLayer] },
                    })
                  );

                  this.addedGroundControlPoints = true;
                }

                done();
              })
              .fail((_, __, err) => done(err))
          );
        },
        (err) => {
          if (err) {
            if (err !== "abort") {
              this.setState({ error: err.message || JSON.stringify(err) });
            }
            reject();
          } else resolve();
        }
      );
    });
  }

  componentDidMount() {
    const { showBackground, tiles } = this.props;

    this.map = Leaflet.map(this.container, {
      scrollWheelZoom: true,
      positionControl: true,
      zoomControl: false,
      minZoom: 0,
      maxZoom: 24,
    });

    // For some reason, in production this class is not added (but we need it)
    // leaflet bug?
    $(this.container).addClass("leaflet-touch");

    // This controls is for countours and measurements, map and tiles is necessary props

    PluginsAPI.Map.triggerWillAddControls({
      map: this.map,
      tiles,
    });

    let scaleControl = Leaflet.control
      .scale({
        maxWidth: 250,
      })
      .addTo(this.map);

    // add zoom control with your options
    let zoomControl = Leaflet.control
      .zoom({
        position: "bottomleft",
      })
      .addTo(this.map);

    if (showBackground) {
      this.basemaps = {};

      Basemaps.forEach((src, idx) => {
        const { url, ...props } = src;
        const tileProps = Utils.clone(props);
        tileProps.maxNativeZoom = tileProps.maxZoom;
        tileProps.maxZoom = tileProps.maxZoom + 99;
        const layer = L.tileLayer(url, tileProps);

        if (idx === 0) {
          layer.addTo(this.map);
        }

        this.basemaps[props.label] = layer;
      });

      const customLayer = L.layerGroup();
      customLayer.on("add", (a) => {
        const defaultCustomBm =
          window.localStorage.getItem("lastCustomBasemap") ||
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png";

        let url = window.prompt(
          [
            _("Enter a tile URL template. Valid coordinates are:"),
            _("{z}, {x}, {y} for Z/X/Y tile scheme"),
            _("{-y} for flipped TMS-style Y coordinates"),
            "",
            _("Example:"),
            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          ].join("\n"),
          defaultCustomBm
        );

        if (url) {
          customLayer.clearLayers();
          const l = L.tileLayer(url, {
            maxNativeZoom: 24,
            maxZoom: 99,
            minZoom: 0,
          });
          customLayer.addLayer(l);
          l.bringToBack();
          window.localStorage.setItem("lastCustomBasemap", url);
        }
      });
      this.basemaps[_("Custom")] = customLayer;
      this.basemaps[_("None")] = L.layerGroup();
    }

    this.layersControl = new LayersControl({
      layers: this.state.imageryLayers,
      overlays: this.state.overlays,
    }).addTo(this.map);

    // Adding a overlays for Measurings geometry
    this.layersControl_measuring = new LayersControlMeasuring({
      position: "topleft",
      // layers: this.state.imageryLayers,
      overlays_measuring: this.state.overlays_measuring,
    }).addTo(this.map);

    this.autolayers = Leaflet.control
      .autolayers({
        overlays: {},
        selectedOverlays: [],
        baseLayers: this.basemaps,
      })
      .addTo(this.map);

    // Drag & Drop overlays
    const addDnDZone = (container, opts) => {
      const mapTempLayerDrop = new Dropzone(container, opts);
      mapTempLayerDrop.on("addedfile", (file) => {
        this.setState({ showLoading: true });
        addTempLayer(file, (err, tempLayer, filename) => {
          if (!err) {
            tempLayer.addTo(this.map);
            tempLayer[Symbol.for("meta")] = { name: filename };
            this.setState(
              update(this.state, {
                overlays: { $push: [tempLayer] },
              })
            );
            //zoom to all features
            this.map.fitBounds(tempLayer.getBounds());
          } else {
            this.setState({ error: err.message || JSON.stringify(err) });
          }

          this.setState({ showLoading: false });
        });
      });
      mapTempLayerDrop.on("error", (file) => {
        mapTempLayerDrop.removeFile(file);
      });
    };

    addDnDZone(this.container, { url: "/", clickable: false });

    const AddOverlayCtrl = Leaflet.Control.extend({
      options: {
        position: "topright",
      },

      onAdd: function () {
        this.container = Leaflet.DomUtil.create(
          "div",
          "leaflet-control-add-overlay leaflet-bar leaflet-control"
        );
        Leaflet.DomEvent.disableClickPropagation(this.container);
        const btn = Leaflet.DomUtil.create(
          "a",
          "leaflet-control-add-overlay-button"
        );
        btn.setAttribute(
          "title",
          _("Add a temporary GeoJSON (.json) or ShapeFile (.zip) overlay")
        );

        this.container.append(btn);
        addDnDZone(btn, { url: "/", clickable: true });

        return this.container;
      },
    });
    new AddOverlayCtrl().addTo(this.map);

    this.map.fitWorld();
    this.map.attributionControl.setPrefix("");

    this.setState({ showLoading: true });
    this.loadImageryLayers(true)
      .then(() => {
        this.setState({ showLoading: false });
        this.map.fitBounds(this.mapBounds);

        this.map
          .on("click", (e) => {
            // Find first tile layer at the selected coordinates
            for (let layer of this.state.imageryLayers) {
              if (layer._map && layer.options.bounds.contains(e.latlng)) {
                this.lastClickedLatLng = this.map.mouseEventToLatLng(
                  e.originalEvent
                );
                this.updatePopupFor(layer);
                if (!this.state.drawMode) {
                  layer.openPopup();
                }
                break;
              }
            }
          })
          .on("popupopen", (e) => {
            // Load task assets links in popup
            if (
              e.popup &&
              e.popup._source &&
              e.popup._content &&
              !e.popup.options.lazyrender
            ) {
              const infoWindow = e.popup._content;
              if (typeof infoWindow === "string") return;

              const $assetLinks = $("ul.asset-links", infoWindow);

              if ($assetLinks.length > 0 && $assetLinks.hasClass("loading")) {
                const { id, project } = (
                  e.popup._source[Symbol.for("meta")] || {}
                ).task;

                $.getJSON(`/api/projects/${project}/tasks/${id}/`)
                  .done((res) => {
                    const { available_assets } = res;
                    const assets = AssetDownloads.excludeSeparators();
                    const linksHtml = assets
                      .filter((a) => available_assets.indexOf(a.asset) !== -1)
                      .map((asset) => {
                        return `<li><a href="${asset.downloadUrl(
                          project,
                          id
                        )}">${asset.label}</a></li>`;
                      })
                      .join("");
                    $assetLinks.append($(linksHtml));
                  })
                  .fail(() => {
                    $assetLinks.append(
                      $("<li>" + _("Error: cannot load assets list.") + "</li>")
                    );
                  })
                  .always(() => {
                    $assetLinks.removeClass("loading");
                  });
              }
            }

            if (e.popup && e.popup.options.lazyrender) {
              e.popup.setContent(e.popup.options.lazyrender());
            }
          });
      })
      .catch((e) => {
        this.setState({ showLoading: false, error: e.message });
      });

    PluginsAPI.Map.triggerAddActionButton(
      {
        map: this.map,
        tiles,
      },
      (button) => {
        this.setState(
          update(this.state, {
            pluginActionButtons: { $push: [button] },
          })
        );
      }
    );

    //Anup : Call the loadOverlaysMeasuring here
    this.loadOverlayaMeasuring();

    //Anup: Now add a draw button here
    const editableLayers = new Leaflet.FeatureGroup();
    this.map.addLayer(editableLayers);

    const drawControl = new Leaflet.Control.Draw({
      position: "topleft",
      draw: {
        polygon: {
          allowIntersection: false, // Restricts shapes to simple polygons
          drawError: {
            color: "#e1e100", // Color the shape will turn when intersects
            message: "<strong>Oh snap!<strong> you can't draw that!", // Message that will show when intersect
          },
          shapeOptions: {
            color: "#bada55",
          },
        }, // Enable drawing polygons
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
    });

    drawControl.setDrawingOptions({
      polygon: {
        icon: new Leaflet.DivIcon({
          iconSize: new Leaflet.Point(6, 6),
          // className: "leaflet-div-icon leaflet-editing-icon my-own-class",
        }),

        shapeOptions: {
          color: "#0000FF",
        },
      },
    });

    this.map.addControl(drawControl);
    this.map.on(Leaflet.Draw.Event.CREATED, (e) => {
      this.setState({ drawMode: false });
      const type = e.layerType,
        layer = e.layer;

      editableLayers.addLayer(layer);

      // Assuming you have the categories array
      const categories = [
        { id: 1, category: "Grass" },
        { id: 2, category: "Lake" },
      ];

      // Function to handle form submission
      const saveSelectedCategory = (event) => {
        event.preventDefault();
        const selectedCategory = document.querySelector(
          'input[name="selectedCategory"]:checked'
        );

        if (selectedCategory) {
          const categoryId = selectedCategory.value;
          // Perform the save operation with the categoryId
          this.setState({ showLoading: true });
          const drawn_geojson = layer.toGeoJSON();
          geojson_grass_api.features.push(drawn_geojson);
          // const geojsonLayer_grass_updated = L.geoJSON(geojson_grass_api);
          // geojsonLayer_grass_updated[Symbol.for("meta")] = {
          //   name: "Grass Updated",
          //   icon: "fa fa-tree fa-fw",
          // };

          // this.setState(
          //   update(this.state, {
          //     overlays_measuring: {
          //       $push: [...this.state.overlays_measuring],
          //     },
          //   })
          // );

          this.loadOverlayaMeasuring();

          setTimeout(() => {
            this.setState({ showLoading: false });
            this.setState({ drawMode: false });
            layer.closePopup();
            editableLayers.clearLayers();
          }, 3000);
        } else {
          console.log("Please select a category to save");
        }
      };

      // Function to handle delete button click
      const deleteSelectedCategory = () => {
        const selectedCategory = document.querySelector(
          'input[name="selectedCategory"]:checked'
        );
        this.setState({ drawMode: true });
        editableLayers.clearLayers();
      };

      // Function to handle edit button click
      const editSelectedCategory = () => {
        const selectedCategory = document.querySelector(
          'input[name="selectedCategory"]:checked'
        );
        this.setState({ drawMode: true });
        layer.editing.enable();
        layer.closePopup();
      };

      // layer.bindPopup(popupContent).openPopup();
      layer.bindPopup(
        mapPopupGenerator(
          categories,
          deleteSelectedCategory,
          editSelectedCategory,
          saveSelectedCategory
        )
      );
      layer.openPopup();
    });

    this.map.on(Leaflet.Draw.Event.DRAWSTART, (e) => {
      editableLayers.clearLayers();
      this.setState({ drawMode: true });
    });
    this.map.on(Leaflet.Draw.Event.DRAWSTOP, (e) => {
      this.setState({ drawMode: false });
    });

    // I have to investigate on this
    PluginsAPI.Map.triggerDidAddControls({
      map: this.map,
      tiles: tiles,
      controls: {
        autolayers: this.autolayers,
        scale: scaleControl,
        zoom: zoomControl,
        // draw: drawControl,
      },
    });
  }

  componentDidUpdate(prevProps, prevState) {
    this.state.imageryLayers.forEach((imageryLayer) => {
      imageryLayer.setOpacity(this.state.opacity / 100);
      this.updatePopupFor(imageryLayer);
    });

    if (prevProps.tiles !== this.props.tiles) {
      this.loadImageryLayers(true);
    }

    if (
      this.layersControl &&
      (prevState.imageryLayers !== this.state.imageryLayers ||
        prevState.overlays !== this.state.overlays)
    ) {
      this.layersControl.update(this.state.imageryLayers, this.state.overlays);
    }
    if (
      this.layersControl_measuring &&
      prevState.overlays_measuring !== this.state.overlays_measuring
    ) {
      this.layersControl_measuring.update(this.state.overlays_measuring);
    }
    if (prevState.drawMode !== this.state.drawMode) {
      // Get the image layer
    }
  }

  componentWillUnmount() {
    this.map.remove();

    if (this.tileJsonRequests) {
      this.tileJsonRequests.forEach((tileJsonRequest) =>
        tileJsonRequest.abort()
      );
      this.tileJsonRequests = [];
    }
  }

  handleMapMouseDown(e) {
    // Make sure the share popup closes
    if (this.shareButton) this.shareButton.hidePopup();
  }

  render() {
    return (
      <div style={{ height: "100%" }} className="map">
        <ErrorMessage bind={[this, "error"]} />
        <div className="opacity-slider theme-secondary hidden-xs">
          {_("Opacity:")}{" "}
          <input
            type="range"
            step="1"
            value={this.state.opacity}
            onChange={this.updateOpacity}
          />
        </div>
        <Standby message={_("Loading...")} show={this.state.showLoading} />
        <div
          style={{ height: "100%" }}
          ref={(domNode) => (this.container = domNode)}
          onMouseDown={this.handleMapMouseDown}
        />
        <div className="actionButtons">
          {this.state.pluginActionButtons.map((button, i) => (
            <div key={i}>{button}</div>
          ))}
          {this.props.shareButtons &&
            !this.props.public &&
            this.state.singleTask !== null ? (
            <ShareButton
              ref={(ref) => {
                this.shareButton = ref;
              }}
              task={this.state.singleTask}
              linksTarget="map"
            />
          ) : (
            ""
          )}
          <SwitchModeButton
            task={this.state.singleTask}
            type="mapToModel"
            public={this.props.public}
          />
        </div>
      </div>
    );
  }
}

export default Map;

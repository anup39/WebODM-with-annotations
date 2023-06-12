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
import ExportControl from "./ExportControl";
import update from "immutability-helper";
import Utils from "../classes/Utils";
import "../vendor/leaflet/Leaflet.Ajax";
import "rbush";
import "../vendor/leaflet/leaflet-markers-canvas";
import { _ } from "../classes/gettext";

// # ADDED BY ME
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet.browser.print/dist/leaflet.browser.print";
import "leaflet-draw";
import mapPopupGenerator from "./MapPopupGenerator";
import axios from "axios";

function convertCoordinatesToWKT(coordinates) {
  const srid = 3857;

  const wktCoords = coordinates[0].map((coord) => {
    const x = (coord.lng * 20037508.34) / 180;
    const y =
      Math.log(Math.tan(((90 + coord.lat) * Math.PI) / 360)) / (Math.PI / 180);
    const yConverted = (y * 20037508.34) / 180;
    return `${x} ${yConverted}`;
  });

  const polygon = `POLYGON ((${wktCoords.join(", ")}, ${wktCoords[0]}))`;
  const wkt = `SRID=${srid};${polygon}`;

  return wkt;
}

function getCookie(name) {
  const cookieValue = document.cookie.match(
    "(^|;)\\s*" + name + "\\s*=\\s*([^;]+)"
  );
  return cookieValue ? cookieValue.pop() : "";
}

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
      standard_categories: [],
      sub_categories: [],
      categories_measuring: [],
      // overlays_measuring: [],
      extent: [],
    };

    this.basemaps = {};
    this.mapBounds = null;
    this.autolayers = null;
    this.addedCameraShots = false;

    this.loadImageryLayers = this.loadImageryLayers.bind(this);
    this.loadOverlayaMeasuring = this.loadOverlayaMeasuring.bind(this);
    this.updatePopupFor = this.updatePopupFor.bind(this);
    this.handleMapMouseDown = this.handleMapMouseDown.bind(this);
    this.handleCloseExport = this.handleCloseExport.bind(this);
    this.handleSubmitExport = this.handleSubmitExport.bind(this);
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
    const project_id = this.props.project_id;

    axios
      .get(`/api/projects/${project_id}`)
      .then((res) => {
        axios
          .get(`/api/project-measuring-category/?project=${project_id}`)
          .then((res) => {
            const data = res.data.results;
            this.setState({ categories_measuring: data });
          });

        axios
          .get(`/api/project-sub-category/?project=${project_id}`)
          .then((res) => {
            const data = res.data.results;
            this.setState({ sub_categories: data });
          });
        axios
          .get(`/api/project-standard-category/?project=${project_id}`)
          .then((res) => {
            const data = res.data.results;
            this.setState({ standard_categories: data });
          });
      })
      .catch((err) => {
        console.log(err, "error");
      });
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
                                <div class="popup-opacity-slider">Opacity: <input id="layerOpacity" type="range" value="${
                                  layer.options.opacity
                                }" min="0" max="1" step="0.01" /></div>
                                <div>Bounds: [${layer.options.bounds
                                  .toBBoxString()
                                  .split(",")
                                  .join(", ")}]</div>
                                <ul class="asset-links loading">
                                    <li><i class="fa fa-spin fa-sync fa-spin fa-fw"></i></li>
                                </ul>

                                <button
                                    onclick="location.href='/3d/project/${
                                      meta.task.project
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
      // overlays_measuring: this.state.overlays_measuring,
      categories_measuring: this.state.categories_measuring,
      sub_categories: this.state.sub_categories,
      standard_categories: this.state.standard_categories,
      project_name: this.props.project_name,
      project_id: this.props.project_id,
    }).addTo(this.map);

    // Adding the export control to the ui

    // Adding a overlays for Measurings geometry
    this.exportControl = new ExportControl({
      position: "topleft",
      project_id: this.props.project_id,
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

    // Export map

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

      console.log(type, "type");

      if (type === "rectangle") {
        this.setState({ showLoading: true });
        const bounds = layer.getBounds();
        const formattedBbox = [
          bounds.getSouthWest().lng,
          bounds.getSouthWest().lat,
          bounds.getNorthEast().lng,
          bounds.getNorthEast().lat,
        ];

        setTimeout(() => {
          editableLayers.clearLayers();
        }, 3000);

        axios
          .post("http://137.135.165.161:8050/api/qgis/export/", {
            project_id: "1",
            title: "Drawn",
            description: "this is my map",
            extent: { bbox: formattedBbox },
          })
          .then((response) => {
            console.log(response.data);
            this.setState({ showLoading: false });
          })
          .catch((error) => {
            console.log(error);
          });
      }

      // Function to handle form submission
      const saveSelectedCategory = (event) => {
        event.preventDefault();
        const selectedCategory = document.querySelector(
          'select[name="selectedCategory"]'
        );

        if (selectedCategory && selectedCategory.value) {
          const categoryId = selectedCategory.value;
          const wkt_ = convertCoordinatesToWKT(layer.getLatLngs());
          this.setState({ showLoading: true });

          axios
            .post(
              "/api/category-geometry/",
              {
                geom: wkt_,
                measuring_category: categoryId,
              },
              {
                headers: {
                  "X-CSRFToken": getCookie("csrftoken"),
                },
              }
            )
            .then((res) => {
              this.setState({ showLoading: false });
              this.setState({ drawMode: false });
              layer.closePopup();
              editableLayers.clearLayers();
            })
            .catch((err) => {
              console.log(err);
            });

          this.loadOverlayaMeasuring();
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
          this.state.categories_measuring,
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
      (prevState.categories_measuring !== this.state.categories_measuring ||
        prevState.sub_categories !== this.state.sub_categories ||
        prevState.standard_categories !== this.state.standard_categories)
    ) {
      this.layersControl_measuring.update(
        this.state.categories_measuring,
        this.state.sub_categories,
        this.state.standard_categories,
        this.props.project_name,
        this.props.project_id
      );
    }
    if (
      this.layersControl &&
      (prevState.imageryLayers !== this.state.imageryLayers ||
        prevState.overlays !== this.state.overlays)
    ) {
      this.layersControl.update(this.state.imageryLayers, this.state.overlays);
    }
    if (this.exportControl) {
      this.exportControl.update(this.props.project_id);
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
  handleCloseExport() {
    // Anup change this to ref or state
    const otherDiv = document.getElementById("export-container");
    otherDiv.style.display = "none"; // Show the other div
  }

  handleSubmitExport() {
    console.log("Export  is clicked ");
    const mapContainer = document.getElementById("map");

    // Convert the map container to an image using html2canvas
    html2canvas(mapContainer).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");

      // Generate PDF using html2pdf
      const pdfOptions = {
        margin: [0, 0, 0, 0],
        filename: "map.pdf",
        image: { type: "png", data: imgData },
        jsPDF: { unit: "px", format: "letter", orientation: "portrait" },
      };

      html2pdf().set(pdfOptions).from(mapContainer).save();
    });
  }

  render() {
    return (
      <div id="map" style={{ height: "100%" }} className="map">
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

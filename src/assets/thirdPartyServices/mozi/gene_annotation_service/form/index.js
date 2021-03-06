import React, { useState } from "react";
import { capitalizeFirstLetter } from "../service";
import AppBar from "@material-ui/core/AppBar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import TextField from "@material-ui/core/TextField";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import FormGroup from "@material-ui/core/FormGroup";
import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import Switch from "@material-ui/core/Switch";
import Typography from "@material-ui/core/Typography";
import CloudUpload from "@material-ui/icons/CloudUpload";
import Check from "@material-ui/icons/Check";
import CircularProgress from "@material-ui/core/CircularProgress";
import Dropzone from "react-dropzone";
import { useSnackbar } from "notistack";
import { Annotate } from "../proto/annotation_pb_service";
import { AnnotationRequest, Annotation, Gene, Filter } from "../proto/annotation_pb";
import "./style.css";
const grpc = require("@improbable-eng/grpc-web").grpc;

const GeneGoOptions = [
  { label: "Biological Process", value: "biological_process" },
  { label: "Cellular Component", value: "cellular_component" },
  { label: "Molecular Function", value: "molecular_function" },
];

const Pathways = [{ label: "Reactome", value: "reactome" }];

const GeneInputMethods = { Manual: 0, Import: 1 };

const AnnotationForm = props => {
  const { enqueueSnackbar } = useSnackbar();
  const geneInputRef = React.createRef();
  const [genes, setGenes] = useState([]);
  const [currentGene, setCurrentGene] = useState("");
  const [annotations, setAnnotations] = useState([]);
  const [parents, setParents] = useState(0);
  const [pathways, setPathways] = useState(["reactome"]);
  const [includeSmallMolecules, setIncludeSmallMolecules] = useState(false);
  const [includeProtiens, setIncludeProtiens] = useState(true);
  const [loading, setLoading] = useState(false);
  const [GOSubgroups, setGOSubgroups] = useState(["biological_process", "cellular_component", "molecular_function"]);
  const [geneInputMethod, setGeneInputMethod] = useState(GeneInputMethods.Manual);

  const addGene = e => {
    const gene = e
      .trim()
      .toUpperCase()
      .split(" ")
      .filter(g => g);
    gene.some(g => genes.includes(g))
      ? enqueueSnackbar("Gene already exists", {
          variant: "warning",
          anchorOrigin: {
            vertical: "top",
            horizontal: "center",
          },
        })
      : setGenes([...genes, ...gene]);
    setCurrentGene("");
  };

  const toggleAnnotation = (annotation, e) => {
    const updated = e.target.checked ? [...annotations, annotation] : annotations.filter(a => a !== annotation);
    setAnnotations(updated);
  };

  const toggleGoSubgroup = (subgroup, e) => {
    const updated = e.target.checked ? [...GOSubgroups, subgroup] : GOSubgroups.filter(s => s !== subgroup);
    setGOSubgroups(updated);
  };

  const togglePathways = (subgroup, e) => {
    const updated = e.target.checked ? [...pathways, subgroup] : pathways.filter(s => s !== subgroup);
    setPathways(updated);
  };

  const handleFileUpload = file => {
    const reader = new FileReader();
    reader.onload = () => {
      setGenes(reader.result.split("\n"));
      enqueueSnackbar("Genes imported!", {
        variant: "success",
        anchorOrigin: {
          vertical: "top",
          horizontal: "center",
        },
      });
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    setLoading(true);
    const annotationRequest = new AnnotationRequest();
    annotationRequest.setGenesList(
      genes.map(g => {
        const gene = new Gene();
        gene.setGenename(g);
        return gene;
      })
    );
    // Namespace and number of parents
    const namespace = new Filter();
    namespace.setFilter("namespace");
    namespace.setValue(GOSubgroups.join(" "));
    const nop = new Filter();
    nop.setFilter("parents");
    nop.setValue(parents);
    annotationRequest.setAnnotationsList(
      annotations.map(sa => {
        const annotation = new Annotation();
        annotation.setFunctionname(sa);
        if (sa === "gene-go-annotation") {
          annotation.setFiltersList([namespace, nop]);
        } else if (sa === "gene-pathway-annotation") {
          const ps = new Filter();
          ps.setFilter("namespace");
          ps.setValue(pathways.join(" "));
          const ism = new Filter();
          ism.setFilter("include_small_molecule");
          ism.setValue(capitalizeFirstLetter(includeSmallMolecules.toString()));
          const ip = new Filter();
          ip.setFilter("include_prot");
          ip.setValue(capitalizeFirstLetter(includeProtiens.toString()));
          annotation.setFiltersList([
            ps,
            ip,
            ism,
            ...(annotations.includes("gene-go-annotation") ? [namespace, nop] : []),
          ]);
        } else if (sa === "biogrid-interaction-annotation") {
          const int = new Filter();
          int.setFilter("interaction");
          int.setValue(includeProtiens ? "Proteins" : "Genes");
          annotation.setFiltersList([int, ...(annotations.includes("gene-go-annotation") ? [namespace, nop] : [])]);
        }
        return annotation;
      })
    );


    const requestProps = {
      request: annotationRequest,
      onEnd: ({ status, statusMessage, message: msg }) => {
        setLoading(false);
        if (status === grpc.Code.OK) {
          props.onResponse(msg.array[0].substr(msg.array[0].indexOf("id=") + 3));
        } else {
          if (statusMessage.includes("Gene Doesn't exist")) {
            const invalidGenes = statusMessage
              .split("`")[1]
              .split(",")
              .map(g => g.trim())
              .filter(g => g);
            setGenes(genes.filter(g => !invalidGenes.includes(g)));
            enqueueSnackbar("Gene not found!", {
              variant: "warning",
              anchorOrigin: {
                vertical: "top",
                horizontal: "center",
              },
            });
          } else {
            enqueueSnackbar(
              <div>
                <Typography variant="body2">An error occurred</Typography>
                <Typography variant="body2">{statusMessage}</Typography>
              </div>,
              {
                variant: "error",
                anchorOrigin: {
                  vertical: "top",
                  horizontal: "center",
                },
              }
            );
          }
        }
      },
    };

    props.serviceClient.unary(Annotate.Annotate, requestProps);
  };

  return (
    <div className="container form-wrapper">
      {/* Gene List */}
      <Typography variant="h6" gutterBottom>
        Input Genes
      </Typography>
      <AppBar position="static" color="default" style={{ marginBottom: 15 }}>
        <Tabs
          indicatorColor="primary"
          textColor="primary"
          value={geneInputMethod}
          onChange={(e, value) => {
            setGeneInputMethod(value);
          }}
          variant="fullWidth"
        >
          <Tab label="Input directly" key={GeneInputMethods.Manual} />
          <Tab label="Import from file" key={GeneInputMethods.Import} />
        </Tabs>
      </AppBar>
      {geneInputMethod === GeneInputMethods.Manual && (
        <TextField
          ref={geneInputRef}
          placeholder="Input gene name"
          helperText="You may input space separated gene names and hit enter"
          fullWidth
          value={currentGene}
          variant="outlined"
          onChange={e => setCurrentGene(e.target.value)}
          onKeyPress={e => {
            if (e.key === "Enter") addGene(currentGene);
          }}
        />
      )}
      {geneInputMethod === GeneInputMethods.Import && (
        <Dropzone
          multiple={false}
          onDrop={files => {
            const file = files[0];
            handleFileUpload(file);
          }}
          style={{ marginBottom: 15 }}
        >
          {({ getRootProps, getInputProps, isDragActive }) => {
            return (
              <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? "dropzone--isActive" : ""}`}
                style={{
                  textAlign: "center",
                  padding: "30px",
                  border: "dashed 1px #90D4FF",
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload style={{ fontSize: "48px" }} />
                {isDragActive ? (
                  <Typography variant="h5" gutterBottom>
                    Drop file here...
                  </Typography>
                ) : (
                  <Typography variant="body1" gutterBottom>
                    Please make sure the file is a plain text file containing a gene name per line.
                  </Typography>
                )}
              </div>
            );
          }}
        </Dropzone>
      )}
      <div className="gene-list">
        {genes.map(g => (
          <Chip
            style={{ margin: 5 }}
            color="primary"
            key={g}
            label={g}
            onDelete={() => setGenes(genes.filter(f => f !== g))}
          />
        ))}
        {genes.length > 1 && (
          <IconButton aria-label="delete" color="secondary">
            <DeleteIcon onClick={e => setGenes([])} />
          </IconButton>
        )}
      </div>
      {/* Annotations */}
      <Typography variant="h6" gutterBottom>
        Annotations
      </Typography>
      <ul className="annotation-list">
        <li>
          <FormGroup row>
            <FormControlLabel
              control={<Checkbox color="primary" onChange={e => toggleAnnotation("gene-go-annotation", e)} />}
              label="Gene-GO"
            />
          </FormGroup>

          {annotations.includes("gene-go-annotation") && (
            <div className="annotation-parameters">
              <div className="parameter">
                <FormGroup row>
                  {GeneGoOptions.map(o => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          color="primary"
                          value={o.value}
                          defaultChecked={GOSubgroups.includes(o.value)}
                          onChange={e => toggleGoSubgroup(o.value, e)}
                        />
                      }
                      label={o.label}
                    />
                  ))}
                </FormGroup>
              </div>
              <div className="parameter">
                <TextField
                  label="Number of parents"
                  value={parents}
                  error={parents === "" || isNaN(parents)}
                  onChange={e => setParents(e.target.value)}
                  type="number"
                  variant="outlined"
                  helperText={
                    parents === "" || isNaN(parents) ? (
                      <Typography variant="body2" gutterBottom>
                        Number of parents needs to be a valid number
                      </Typography>
                    ) : null
                  }
                />
              </div>
            </div>
          )}
        </li>
        <li>
          <FormGroup row>
            <FormControlLabel
              control={<Checkbox color="primary" onChange={e => toggleAnnotation("gene-pathway-annotation", e)} />}
              label="Gene Pathway"
            />
          </FormGroup>
          {annotations.includes("gene-pathway-annotation") && (
            <div className="annotation-parameters">
              <div className="parameter">
                {Pathways.map(p => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        color="primary"
                        value={p.value}
                        onChange={e => togglePathways(p.value, e)}
                        defaultChecked={pathways.includes(p.value)}
                      />
                    }
                    label={p.label}
                  />
                ))}
              </div>
              <div className="parameter">
                <FormGroup row>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeSmallMolecules}
                        onChange={e => setIncludeSmallMolecules(e.target.checked)}
                        value="smallMolecules"
                        color="primary"
                      />
                    }
                    label="Small molecules"
                  />
                </FormGroup>
              </div>
            </div>
          )}
        </li>
        <li>
          <FormGroup row>
            <FormControlLabel
              control={
                <Checkbox color="primary" onChange={e => toggleAnnotation("biogrid-interaction-annotation", e)} />
              }
              label="Biogrid Protien Interaction"
            />
          </FormGroup>
        </li>
      </ul>
      <FormControlLabel
        control={
          <Switch
            checked={includeProtiens}
            onChange={e => setIncludeProtiens(e.target.checked)}
            value="protiens"
            color="primary"
          />
        }
        label="Include protiens"
      />
      <div className="actions">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={!annotations.length || !genes.length || loading}
        >
          {loading ? (
            <CircularProgress color="inherit" size={24} style={{ marginRight: 15 }} />
          ) : (
            <Check style={{ marginRight: 15 }} />
          )}
          {loading ? " Processing annotation request ..." : " Submit"}
        </Button>
      </div>
    </div>
  );
};

export default AnnotationForm;

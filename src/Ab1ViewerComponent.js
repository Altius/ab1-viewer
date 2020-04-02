import React, { useEffect } from 'react';
import { ab1ToJson } from 'bio-parsers';
import PropTypes from 'prop-types';
import { css } from '@emotion/core'
import styled from "@emotion/styled"

const style = css({
    backgroundColor: "blue"
})


const Styled = styled("webTraceViewer")`
    .ab1Viewer__label.ab1Viewer__zoomLabel:not(:first-child) {
        margin-left: 10px;
    }

    .ab1Viewer__label {
        margin-right: 5px;
    }

    .ab1Viewer__buttonX,
    .ab1Viewer__buttonY,
    .ab1Viewer__buttonReset {
        background-color: #EAAC6F;
        height: 20px;
    }

    .ab1Viewer__buttonX,
    .ab1Viewer__buttonY {
        width: 20px;
    }

    .ab1Viewer__buttonReset {
        width: 50px;
    }
`

const propTypes = {
    ab1File: function (props, propName, componentName) {
        if (props[propName] && !(props[propName] instanceof File) && !(props[propName] instanceof Blob)) {
            return new Error(
                'Invalid prop `' + propName + '` supplied to' +
                ' `' + componentName + '`. Validation failed.'
            )
        }
    },
    buttonStyle: PropTypes.object,
    jsonData: PropTypes.object,
    height: PropTypes.string,
    name: PropTypes.string,
    width: PropTypes.string
}

const defaultProps = {
    buttonStyle: {

    },
    height: '200',
    width: '800px',
}

const WebTraceViewer = (props) => {

    const canvasRef = React.createRef()

    let xZoom = 1;
    let yZoom = 1;
    const yLimit = 80; // max y a trace can have, so the graph stays in the canvas

    const phy = function () { };

    //---------------------------------------------------------
    //
    //---------------------------------------------------------
    phy.zoomReset = function () {
        // $('zoom_reset').disabled = true;
        yZoom = xZoom = 1;
        phy.prepare_draw();
        // $('zoom_reset').disabled = false;
    }
    phy.zoomIn = function (axis) {
        // $(axis + '_zoom_in').disabled = true;
        const zVar = axis + 'Zoom';
        eval(zVar + " *= 1.3"); // use an object for xZoom/yZoom and do obj[zVar] instead of eval() ?
        phy.prepare_draw();
        // $(axis + '_zoom_in').disabled = false;
    }

    phy.zoomOut = function (axis) {
        // $(axis + '_zoom_out').disabled = true;
        const zVar = axis + 'Zoom';
        eval(zVar + " /= 1.3");
        phy.prepare_draw();
        // $(axis + '_zoom_out').disabled = false;
    }
    //---------------------------------------------------------
    phy.prepare_draw = function (d) {

        if (d)
            phy.data = d;

        // Get the data
        const display_id = phy.data['d'] || 'unnamed';

        const sequence = phy.data['baseCalls'] ? phy.data['baseCalls'].join('') : '';
        const traces = {};

        ['aTrace', 'tTrace', 'gTrace', 'cTrace'].forEach(function (base, i) {
            const arr = [];
            phy.data[base].forEach(function (b) {
                arr.push(b);
                //arr.push(parseInt(b, 10));
            });
            traces[base] = arr;
        });

        const data = {
            seq_display_id: display_id,
            sequence: sequence,
            qscores: phy.data['qualNums'],
            trace_values: traces,
            base_locations: phy.data['basePos']
        };

        phy.draw(data);
    };
    //---------------------------------------------------------

    phy.draw = function (data) {

        const canvas = canvasRef.current;
        if (!canvas || !canvas.getContext)
            return;

        const padding = 5;
        const height = props.height;
        const baseCallYPos = 30;
        const qualScoreSectionHeight = 30;
        const qualScoreYPos = baseCallYPos + qualScoreSectionHeight;
        const baseLocationYPos = 70;
        const ctx = canvas.getContext('2d');

        const title = data['seq_display_id'];
        let sequence = data['sequence'];
        const qualityScores = data['qscores'];

        // normalize trace values
        let a_trace_values = data['trace_values']['aTrace'];
        const a_trace_max = a_trace_values.reduce((a, b) => {
            return Math.max(a, b);
        })
        a_trace_values = a_trace_values.map(v => v / a_trace_max * 100);
        let t_trace_values = data['trace_values']['tTrace'];
        const t_trace_max = t_trace_values.reduce((a, b) => {
            return Math.max(a, b);
        })
        t_trace_values = t_trace_values.map(v => v / t_trace_max * 100);
        let c_trace_values = data['trace_values']['cTrace'];
        const c_trace_max = c_trace_values.reduce((a, b) => {
            return Math.max(a, b);
        })
        c_trace_values = c_trace_values.map(v => v / c_trace_max * 100);
        let g_trace_values = data['trace_values']['gTrace'];
        const g_trace_max = g_trace_values.reduce((a, b) => {
            return Math.max(a, b);
        })
        g_trace_values = g_trace_values.map(v => v / g_trace_max * 100)
        const a_color = 'green';
        const t_color = 'red';
        const c_color = 'blue';
        const g_color = 'black';
        const baseLocations = data['base_locations']; // The position of the base in the entire sequence
        const baseLocationsPositions = []; // The position of the base on the canvas (in our subsequence)


        let offset = 0;
        // 'offset' only exists for the consensus sequence. If represents how many
        // bases the consensus trace should be offset by, in the event that there are
        // less than 3 nucleotides in the sequence preceeding the base in question. 
        // The purpose of this is to put the base in question in the middle of the mini
        // consensus trace canvas (in between the 2 vertical lines) for a consistent look. 
        //
        // This function offsets the base locations, q scores, and sequence by the
        // required offset (1 - 3). The trace itself is offset in the drawTrace fxn.
        if (data['offset'] && data['offset'] != 0) {
            offset = data['offset'];
            const startingPoint = baseLocations[0];
            for (let i = 1; i <= offset; i++) {
                baseLocations.splice(i - 1, 0, startingPoint - ((offset - i + 1) * 15));
                qualityScores.splice(0, 0, 0);
                sequence = " " + sequence;
            }
        }

        // Normalize the base locations to baseLocationsPositions
        for (let b = 0; b < baseLocations.length; b++) {
            baseLocationsPositions[b] = baseLocations[b] - baseLocations[0];
        }

        const lastBase = Math.max.apply(Math, baseLocationsPositions);

        // Calculate the width of the canvas.
        // If it's the consensus editor, make it the width of the Display ID (unless the trace
        // runs longer than than the Display ID, then set it to the width of the trace).
        // If it's the View Sequences (entire sequence), make it the width of the entire sequence.
        // ('seq_id' is only passed from the consensus editor - that's how we check)
        if (data['seq_id']) {
            if (ctx.measureText(title).width > lastBase) {
                canvas.width = ctx.measureText(title).width + 15;
            }
            else {
                canvas.width = lastBase + 15;
            }
        }
        else {
            canvas.width = lastBase * xZoom + 15;
        }

        function drawTrace(n, color) {
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(padding + (offset * 15), height - padding);
            n.forEach(function (x, i) {
                let y = height - padding - x * yZoom;

                if (y < yLimit) {
                    y = yLimit;
                }

                ctx.lineTo(padding + (i * xZoom) + (offset * 15), y);
            });
            ctx.stroke();
            ctx.closePath();
        }
        drawTrace(a_trace_values, a_color);
        drawTrace(t_trace_values, t_color);
        drawTrace(c_trace_values, c_color);
        drawTrace(g_trace_values, g_color);

        // Draw The Labels
        ctx.fillStyle = "black";
        ctx.fillText(title, padding, 15);
        ctx.fillText("Quality", padding, 43);
        ctx.fillText("Trace", padding, 83);
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        ctx.fillRect(padding - 2, 4, ctx.measureText(title).width + 4, 14);
        ctx.fillRect(padding - 2, 32, 38, 14);
        ctx.fillRect(padding - 2, 72, 31, 14);

        // Draw the 'Quality Score = 20' line (99% accuracy line)
        // Setting line to 5 instead of 20 since I will divide all 
        // the QS's by 4 (so they fit in the designated height of 50px)
        ctx.strokeStyle = "#33CCFF";
        ctx.beginPath();
        ctx.moveTo(padding, qualScoreYPos - 5.5);
        ctx.lineTo(canvas.width - padding, qualScoreYPos - 5.5);
        ctx.stroke();
        ctx.closePath();


        // Draw The Base Calls at the appropriate base locations
        // const i = 0;
        //for (const x in baseLocations){
        baseLocationsPositions.forEach(function (bl, i) {
            const base = sequence.charAt(i);
            switch (base) {
                case 'A':
                    ctx.fillStyle = "green";
                    break;
                case 'T':
                    ctx.fillStyle = "red";
                    break;
                case 'C':
                    ctx.fillStyle = "blue";
                    break;
                case 'G':
                    ctx.fillStyle = "black";
                    break;
                case 'N':
                    ctx.fillStyle = "black";
                    break;
            }
            ctx.fillText(base, padding + bl * xZoom, baseCallYPos);

            if (!data['seq_id']) {
                if ((i + 1) % 10 == 0) {
                    ctx.fillStyle = "black";
                    ctx.fillText(i + 1, padding + bl * xZoom - 3, baseLocationYPos);
                }
            }
        });

        // Draw The Quality Score Bars
        // The width of the Quality Score bar is calculated in this way so 
        // that it matches the width of a single nucleotide base call no            
        // matter what font or size it is. 
        // Note: I'm dividing the quality score values by 4 so eveything fits
        // in the designated 50px area
        const nucleotideWidth = ctx.measureText(sequence).width / sequence.length;
        ctx.fillStyle = "rgba(0, 0, 200, 0.5)";

        if (qualityScores.length) {
            baseLocationsPositions.forEach(function (bl, i) {
                ctx.fillRect(
                    padding + bl * xZoom, qualScoreYPos - qualityScores[i] / 4,
                    nucleotideWidth, qualityScores[i] / 4
                );
            });
        }
        else {
            ctx.fillStyle = "black";
            ctx.fillText("Alert: No quality scores for this trace file", 50, 43);
            ctx.fillStyle = "rgba(255, 255, 0, 0.2)";
            ctx.fillRect(48, 32, 192, 14);
        }

        // Draw lines surrounding base in question (for consensus only)
        if (data['seq_id']) {
            ctx.fillStyle = "#666666";
            ctx.fillRect(baseLocationsPositions[3] + 3, baseCallYPos - 10, 0.5, 185);
            ctx.fillRect(baseLocationsPositions[3] + 13, baseCallYPos - 10, 0.5, 185);
        }
    };

    phy.load_data = function (file) {

        new Ajax.Request(file, {
            method: 'get',
            onSuccess: function (transport) {
                const response = transport.responseText || "{'status':'error', 'message':'No response'}";
                const r = response.evalJSON();

                phy.prepare_draw(r);
            },
            onFailure: function () {
                alert('Something went wrong!\nAborting...');
            }
        });

    };

    useEffect(() => {
        if (props.jsonData) {
            if (props.name) {
                props.jsonData.d = props.name
            }
            phy.prepare_draw(props.jsonData)
        } else if (props.ab1File) {
            async function parseAb1() {
                const ab1Data = await ab1ToJson(props.ab1File)
                if (ab1Data[0]) {
                    const data = {
                        ...ab1Data[0].parsedSequence.chromatogramData,
                        'd': props.name || props.ab1File.name
                    }
                    phy.prepare_draw(data);
                }
            }
            parseAb1()
        }
    })

    const height = props.height
    const width = props.width

    const containerStyle = {
        width,
        overflow: 'scroll'
    }

    return (
        <Styled>
            <div className="ab1Viewer__testClass another_class">
                <div id="wtvCanvas1Container" style={containerStyle}>
                    <canvas id="webTraceViewerCanvas1" height={height} ref={canvasRef}>
                        Your browser doesn't supoort this Trace Viewer.
                    </canvas>
                </div>
                <div>
                    <span className="ab1Viewer__label ab1Viewer__zoomLabel">Zoom:</span>
                    <button className="ab1Viewer__buttonReset" onClick={() => phy.zoomReset()}>Reset</button>
                    <span className="ab1Viewer__label ab1Viewer__zoomLabel">X</span>
                    <button className="ab1Viewer__buttonX" onClick={() => phy.zoomOut('x')}>-</button>
                    <button className="ab1Viewer__buttonX" onClick={() => phy.zoomIn('x')}>+</button>
                    <span className="ab1Viewer__label ab1Viewer__zoomLabel">Y</span>
                    <button className="ab1Viewer__buttonY" onClick={() => phy.zoomOut('y')}>-</button>
                    <button className="ab1Viewer__buttonY" onClick={() => phy.zoomIn('y')}>+</button>
                </div>
            </div>
        </Styled>
    )
}

WebTraceViewer.propTypes = propTypes
WebTraceViewer.defaultProps = defaultProps

export default WebTraceViewer
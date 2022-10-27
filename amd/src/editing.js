// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Javascript function for the editing interface of formulas question type
 *
 * @copyright &copy; 2010-2011 Hon Wai, Lau
 * @author Hon Wai, Lau <lau65536@gmail.com>
 * @license http://www.gnu.org/copyleft/gpl.html GNU Public License version 3
 */

import {exception as displayException} from 'core/notification';

/**
 * Update the correctness simple elements from the expert one.
 *
 * @param {String} id
 * @param {boolean} checked
 */
function formulasFormCorrectness(id, checked) {
    // TODO Rewrite this entire thing.
    var errNames = new Array(M.util.get_string('relerror', 'qtype_formulas'), M.util.get_string('abserror', 'qtype_formulas'));
    var nid = 'correctness[' + id + ']';
    var n = document.getElementsByName(nid)[0];
    if (n === null) {
        return;
    }
    var bid = 'id_correctness_' + id + '_buttons';
    var b = document.getElementById(bid);
    if (b === null) {
        var tmp = document.createElement('div');
        tmp.id = bid;
        b = n.parentNode.appendChild(tmp);
    }
    var useRawInput = checked;
    if (!useRawInput) {
        var res = /^\s*(_relerr|_err)\s*(<|==)\s*([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s*$/.exec(n.value);
        if (res === null) {
            if (n.value.replace(/^\s+|\s+$/g, "").length == 0) {
                res = ['', '_relerr', '<', '0.01'];
                n.value = '_relerr < 0.01';
            }
        }
        if (res === null) {
            useRawInput = true;
        } else {
            var s = `<select id="${bid}_type" class="mform form-inline form-control">`;
            if (res[1] === '_relerr') {
                s += `<option value="_relerr" selected="selected">${errNames[0]}</option>`;
                s += `<option value="_err">${errNames[1]}</option>`;
            } else if (res[1] === '_err') {
                s += `<option value="_relerr">${errNames[0]}</option>`;
                s += `<option value="_err" selected="selected">${errNames[1]}</option>`;
            } else {
                // Should not happen!
                s += `<option value="_relerr">${errNames[0]}</option>`;
                s += `<option value="_err" selected="selected">${errNames[1]}</option>`;
            }
            s += `</select>`;
            s += `<select id="${bid}_op" class="mform form-inline form-control">`;
            if (res[2] === '<') {
                s += '<option value="<" selected="selected">&lt</option>';
                s += '<option value="==">==</option>';
            } else if (res[2] === '==') {
                s += '<option value="<">&lt</option>';
                s += '<option value="==" selected="selected">==</option>';
            } else {
                // Should not happen!
                s += '<option value="<">&lt</option>';
                s += '<option value="==">==</option>';
            }
            s += `</select>`;
            s += `<input id="${bid}_tol" type="text" class="mform form-inline form-control" value="${res[3]}">`;
            b.innerHTML = s;
            b.addEventListener('change', (e) => {
                const select = e.target.closest('select');
                if (select.id === `${bid}_type`) {
                    this.formMerge(id);
                    return;
                }
                if (select.id === `${bid}_op`) {
                    this.formMerge(id);
                    return;
                }

                const input = e.target.closest('input');
                if (input.id === `${bid}_tol`) {
                    this.formMerge(id);
                    return;
                }
            });
        }
    }
    n.style.display = useRawInput ? 'block' : 'none';
    b.style.display = useRawInput ? 'none' : 'block';
}


class FormulasForm {
    constructor() {
        // Get all the values that will be usable for the methods in this object.
        this.numsubq = this.countParts();

        // Global options allow the change of the same options in all parts at once.
        try {
            this.initialiseGlobalOptionsForNamedItem('unitpenalty');
            this.initialiseGlobalOptionsForNamedItem('ruleid');
        } catch (e) {
            window.console.warning(e);
        }

        // Allow the easier selection of correctness, rather than manual input of formula.
        for (let i = 0; i < this.numsubq; i++) {
            try {
                this.initialiseSelectiveCriteria(i);
            } catch (e) {
                displayException(e);
            }
        }

        // Add the button to select the number of dataset.
        try {
            this.initialiseNumdatasetOption();
            this.showDatasetAndPreview('none');
        } catch (e) {
            window.console.warning(e);
        }
    }

    /**
     * Update the correctness expert element from the simple ones.
     *
     * @param {String} id
     */
    formMerge(id) {
        const correctnessElement = document.querySelector(`[name="correctness[${id}]"]`);
        const bid = `id_correctness_${id}_buttons`;
        const errorType = document.getElementById(`${bid}_type`).value;
        const errorOp = document.getElementById(`${bid}_op`).value;
        const errorVal = document.getElementById(`${bid}_tol`).value;
        correctnessElement.value = `${errorType} ${errorOp} ${errorVal}`;
    }


    /**
     * Please check this.
     *
     * @param {String} name
     */
    updateOptionsFromGlobal(name) {
        const globalNamedOption = document.getElementsByName(`global${name}`)[0];
        [...document.querySelectorAll(`[name^="${name}[`)].forEach((element) => {
            element.value = globalNamedOption.value;
            element.closest('.form-group').classList.add('hide');
        });
    }

    /**
     * Count the number of parts.
     *
     * @returns {Number}
     */
    countParts() {
        return document.querySelectorAll('[name^="answermark["]').length - 1;
    }

    // By default, the value of global input field will apply to all its parts.
    initialiseGlobalOptionsForNamedItem(name) {
        // Set the global option for the named item to the value of the first instance of it.
        const globalNamedOption = document.querySelector(`[name="global${name}"]`);
        const firstNamedOption = document.querySelector(`[name="${name}[0]"]`);
        globalNamedOption.value = firstNamedOption.value;
        globalNamedOption.addEventListener('change', () => {
            this.updateOptionsFromGlobal(name);
        });
        this.updateOptionsFromGlobal(name);
    }

    // Allow a more user friend way to select the commonly used criteria.
    initialiseSelectiveCriteria(i) {
        const loc = document.getElementById(`id_correctness_${i}`).parentNode.closest(":not(.fitem)");

        const showId = `id_correctness_${i}_show`;
        let showCorrectnessField = document.getElementById(showId);
        if (showCorrectnessField === null) {
            var tmp = document.createElement('div');
            // TODO - this ID creates a duplicate ID on the page. NONO!!
            tmp.id = showId;
            tmp.classList.add('formulas_correctness_show');
            showCorrectnessField = loc.insertBefore(tmp, loc.firstChild);
        }

        // Always unchecked by default.
        const initialChecked = false;

        formulasFormCorrectness(i, initialChecked);

        const wrapper = document.createElement('span');
        wrapper.append(...showCorrectnessField.children);
        showCorrectnessField.append(wrapper);

        const checkbox = document.createElement('input');
        checkbox.id = showId;
        checkbox.checked = true;
        // TODO Replace with langstring.
        checkbox.value = "Expert";

        showCorrectnessField.prepend(checkbox);
        showCorrectnessField.addEventListener('click', () => {
                formulasFormCorrectness(i, checkbox.checked);
        });
    }

    // Add the options to select the number of datasets.
    initialiseNumdatasetOption() {
        // TODO: Convert to a Template.
        const options = Object.entries(([key, value]) => {
            const selected = key == 5 ? 'selected="selected"' : '';
            const option = document.createElement('option');
            option.value = key;
            option.innerHTML = value;
            if (selected == 5) {
                option.selected = true;
            }
            return option;
        });

        const select = document.createElement('select');
        select.append(...options);
        select.name = "numdataset";
        select.id = "numdataset";
        const button = document.createElement('input');
        button.type = 'button';
        button.value = M.util.get_string('instantiate', 'qtype_formulas');
        button.addEventListener('click', () => {
            this.instantiateDataset();
        });

        const div = document.createElement('div');
        div.id = "xxx";

        const loc = document.getElementById('numdataset_option');
        loc.append(
            select,
            button,
            div
        );
    }

    // Instantiate the dataset by the server and get back the data.
    instantiateDataset() {
        var data = [];
        data.varsrandom = document.getElementById('id_varsrandom').value;
        data.varsglobal = document.getElementById('id_varsglobal').value;
        for (var i = 0; i < this.numsubq; i++) {
            data['varslocals[' + i + ']'] = document.getElementById('id_vars1_' + i).value;
            data['answers[' + i + ']'] = document.getElementById('id_answer_' + i).value;
        }
        data.start = 0;
        data.N = document.getElementById('numdataset').value;
        data.random = 0;

        var p = [];
        for (var key in data) {
            p[p.length] = encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
        }
        let params = p.join('&').replace(/ /g, '+');

        var url = M.cfg.wwwroot + '/question/type/formulas/instantiate.php';

        var request = new XMLHttpRequest();
        request.open("POST", url, true);

        request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        request.setRequestHeader("Content-length", params.length);
        request.setRequestHeader("Connection", "close");

        request.addEventListener('readystatechange', () => {
            if (request.readyState == 4 && request.status == 200) {
                this.vars = JSON.parse(request.responseText);
                this.showDatasetAndPreview('block');
                // Add the controls for the display of dataset and preview.
                try {
                    this.updateDataset();
                } catch (e) {
                    window.console.error(e);
                }
                try {
                    this.updateStatistics();
                } catch (e) {
                    window.console.error(e);
                }
                try {
                    this.initPreviewControls();
                } catch (e) {
                    window.console.error(e);
                }
            }
        });
        request.send(params);
        this.showDatasetAndPreview('hidden');
    }

    // Show or hide the dataset and preview region.
    showDatasetAndPreview(show) {
        const childIds = ['qtextpreview_display', 'varsstatistics_display', 'varsdata_display'];
        childIds.forEach((id) => {
            document.getElementById(id).closest('.felement').classList.toggle('hide', show == 'hidden');
        });
    }

    // Return the set of groupnames selected for display.
    getGroupnames() {
        const groupnames = ['leading', 'random', 'global'];
        for (let i = 0; i < 100; i++) { // At most 100 parts.
            groupnames.push(`local${i}`, `answer${i}`);
        }
        return groupnames;
    }

    // Add the controls to view the dataset.
    updateDataset() {
        const loc = document.getElementById('varsdata_display');
        loc.innerHTML = '';

        const groupnames = this.getGroupnames();
        const names = Object.assign({}, this.vars.names);
        names.leading = ['#'];

        const lists = this.vars.lists.map((listItem) => Object.assign({}, listItem));
        const finalItem = lists.length - 1;
        lists[finalItem].leading = [finalItem];

        const result = this.getDatasetDisplay(names, lists, this.vars.errors, groupnames);
        loc.innerHTML = result;
    }

    // Show the statistics for the dataset.
    updateStatistics() {
        var loc = document.getElementById('varsstatistics_display');
        loc.innerHTML = '';

        var groupnames = this.getGroupnames();
        // Var quantities = ['N', 'mean', 'variance', 'min', 'Q1', 'median', 'Q3', 'max'];
        // var quantities = ['min', 'max', 'mean', 'SD', 'N'];
        var quantities = ['min', 'max'];
        var errors = [];
        var names = {};
        names.leading = [''];
        for (let z in this.vars.names) {
            names[z] = this.vars.names[z];
        }
        var lists = [];
        for (let k = 0; k < quantities.length; k++) {
            lists.push({});
        }

        for (let i = 0; i < groupnames.length; i++) {
            var n = this.vars.names[groupnames[i]];
            if (n === null) {
                continue;
            }
            var stat = [];
            for (var j = 0; j < n.length; j++) {
                var data = [];
                for (var count = 0; count < this.vars.lists.length; count++) {
                    try { // Skip all unknown data.
                        var subset = this.vars.lists[count][groupnames[i]];
                        data.push(subset[j]);
                    } catch (e) {
                        window.console.error(e);
                    }
                }
                var tmpst = this.getStatistics(data);
                stat.push(tmpst);
            }
            for (let k = 0; k < quantities.length; k++) {
                lists[k][groupnames[i]] = [];
                for (var z = 0; z < stat.length; z++) {
                    lists[k][groupnames[i]][z] = stat[z][quantities[k]];
                }
            }
        }
        for (let k = 0; k < quantities.length; k++) {
            lists[k].leading = [quantities[k]];
            errors[k] = '';
        }

        var result = this.getDatasetDisplay(names, lists, errors, groupnames);
        loc.innerHTML = result;
    }

    // Return the statistics for the input data.
    getStatistics(data) {
        var sum = 0.0;
        var sum2 = 0.0;
        var minimum = Number.MAX_VALUE;
        var maximum = -Number.MAX_VALUE;
        var N = 0.0;
        for (var i = 0; i < data.length; i++) {
            if (!isNaN(data[i])) {
                sum += data[i];
                sum2 += data[i] * data[i];
                minimum = Math.min(minimum, data[i]);
                maximum = Math.max(maximum, data[i]);
                N++;
            }
        }

        if (N == 0) {
            // No need to perform statistics.
            return {};
        }
        var sd = Math.sqrt((sum2 - sum * sum / N) / (N - 1.0));
        if (N <= 1 || isNaN(sd)) {
            sd = 0;
        }
        return {'N': N, 'mean': sum / N, 'SD': sd, 'min': minimum, 'max': maximum};
    }

    getDatasetDisplayHeader(names, groupNames) {
            return groupNames.map((groupName) => {
            if (names[groupName] === null) {
                return null;
            }

            return names[groupName].map((name) => `<th>${name}</th>`).join("\n");
        }).filter((value) => !!value).join("\n");
    }

    // Display the datatable of the instantiated variables.
    getDatasetDisplay(names, lists, errors, groupnames) {
        let header = this.getDatasetDisplayHeader(names, groupnames);
        header += '<tr>' + header + '</tr>';

        let s = '';
        for (let count = 0; count < lists.length; count++) {
            if (count % 50 == 0) {
                s += header;
            }
            let row = '';
            for (let i = 0; i < groupnames.length; i++) {
                const n = names[groupnames[i]];
                if (n === null) {
                    continue;
                }
                const subset = lists[count][groupnames[i]];
                if (subset === null || subset.length != n.length) {
                    // Stop outputting any further data for this row.
                    break;
                }
                for (let j = 0; j < n.length; j++) {
                    try {
                        row += '<td>' + this.getDatasetShorten(subset[j]) + '</td>';
                    } catch (e) {
                        row += '<td></td>';
                    }
                }
            }

            s += `<tr class="r${count % 2}">${row}`;
            if (errors[count] !== '') {
                s += `<td>${errors[count]}</td>`;
            }
            s += `</tr>`;
        }

        return `<table border="1" width="100%" cellpadding="3">${s}</table>`;
    }

    // Return a html string of the shortened element in the dataset table.
    getDatasetShorten(elem) {
        if (elem instanceof Array) {
            var tmpSs = [];
            for (var k = 0; k < elem.length; k++) {
                if (typeof elem[k] == 'string') {
                    tmpSs[k] = elem[k];
                } else {
                    // Get the shorter one.
                    var s = elem[k].toPrecision(4).length < ('' + elem[k]).length ? elem[k].toPrecision(4) : '' + elem[k];
                    tmpSs[k] = '<span title="' + elem[k] + '">' + s + '</span>';
                }
            }
            return tmpSs.join(', ');
        } else {
            if (typeof elem == 'string') {
                return '<span title="' + elem + '">' + elem + '</span>';
            } else {
                // Get the shorter one.
                const s = elem.toPrecision(4).length < ('' + elem).length ? elem.toPrecision(4) : '' + elem;
                return '<span title="' + elem + '">' + s + '</span>';
            }
        }
    }

    // Add the controls for the preview function.
    initPreviewControls() {
        const loc = document.getElementById('qtextpreview_controls');
        loc.innerHTML = '';

        const options = this.vars.list.map((listItem) => {
            const option = document.createElement('option');
            option.value = listItem;
            option.innerHTML = listItem;
            return option;
        });

        if (options.length) {
            const select = document.createElement('select');
            select.id = 'id_formulas_idataset';
            select.append(...options);
            loc.append(select);
        }

        const button = document.createElement('button');
        button.value = M.util.get_string('renew', 'qtype_formulas');
        loc.append(button);
        loc.addEventListener('click', () => {
            this.updatePreview();
        });

        this.updatePreview();
    }

    // Show the questiontext with variables replaced.
    updatePreview() {
        let globaltext;
        try {
            globaltext = window.tinyMCE.get('id_questiontext').getContent();
        } catch (e) {
            globaltext = document.getElementById('id_questiontext').value;
        }
        var idataset = document.getElementById('id_formulas_idataset').value;
        var res = this.substituteVariablesInText(globaltext, this.getVariablesMapping(idataset, ['random', 'global']));

        for (var i = 0; i < this.numsubq; i++) {
            let txt;
            try {
                txt = window.tinyMCE.get('id_subqtext_' + i).getContent();
            } catch (e) {
                txt = document.getElementById('id_subqtext_' + i).value;
            }
            let fb;
            try {
                fb = window.tinyMCE.get('id_feeback_' + i).getContent();
            } catch (e) {
                fb = document.getElementById('id_feedback_' + i).value;
            }
            var ph = document.getElementsByName('placeholder' + '[' + i + ']')[0];
            var unit = document.getElementsByName('postunit' + '[' + i + ']')[0];
            var answer = this.getVariablesMapping(idataset, ['answer' + i])['@' + (i + 1)];
            if (answer === null) {
                continue;
            }
            var mapping = this.getVariablesMapping(idataset, ['random', 'global', 'local' + i]);
            var t = txt + `<div style="border: solid 1px #aaaaaa; margin : 10px">${answer} ${unit.value.split('=')[0]}</div>`;
            t += (fb.length > 0) ? '<div style="border: solid 1px #aaaaaa; margin : 10px">' + fb + '</div>' : '';
            t = this.substituteVariablesInText(t, mapping);
            t = '<div style="border: solid 1px #ddddff;"> ' + t + '</div>';
            if (ph.value == '') {
                res += t; // Add the text at the end
            } else {
                res = res.replace('{' + ph.value + '}', t);
            }
        }

        var preview = document.getElementById('qtextpreview_display');
        preview.innerHTML = '<div style="border: solid black 2px; padding : 5px">' + res + '</div>';
    }

    // Return the mapping from name to variable values, for the groups specified by groupnames.
    getVariablesMapping(idataset, groupnames) {
        const mapping = {};
        for (var i = 0; i < groupnames.length; i++) {
            var names = this.vars.names[groupnames[i]];
            if (names === null) {
                continue;
            }
            var subset = this.vars.lists[idataset][groupnames[i]];
            if (subset === null || subset.length != names.length) {
                break; // Stop outputting any further data for this row.
            }
            for (var j = 0; j < names.length; j++) {
                mapping[names[j]] = subset[j];
            }
        }
        return mapping;
    }

    // Substitute the variables in the text, where the variables is given by the mapping.
    substituteVariablesInText(text, mapping) {
        var matches = text.match(/\{([A-Za-z][A-Za-z0-9_]*)(\[([0-9]+)\])?\}/g);
        if (matches === null || matches.length == 0) {
            return text;
        }
        for (var i = 0; i < matches.length; i++) {
            var d = /\{([A-Za-z][A-Za-z0-9_]*)(\[([0-9]+)\])?\}/.exec(matches[i]);
            if (d === null) {
                continue;
            }
            if (mapping[d[1]] === null) {
                continue;
            }
            let value = mapping[d[1]];
            if (value instanceof Array) {
                var idx = parseInt(d[3]);
                if (idx >= value.length) {
                    continue;
                }
                value = value[idx];
            }
            text = text.replace(matches[i], value);
        }
        return text;
    }
}

export const init = () => new FormulasForm();

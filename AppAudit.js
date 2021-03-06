/*global require, alert*/
/*
 *
 * @owner Enter you name here (xxx)
 */
/*
 *    Fill in host and port for Qlik engine
 */


//spliced helper function- same as splice, returns mutated array instead of elements removed from array
Array.prototype.spliced = function() {

  // Returns the array of values deleted from array.
  Array.prototype.splice.apply( this, arguments );

  // Return current (mutated) array reference.
  return( this );

};


var config = {
	host: window.location.hostname,
	prefix: "/",
	port: window.location.port,
	isSecure: window.location.protocol === "https:"
};
require.config( {
	baseUrl: ( config.isSecure ? "https://" : "http://" ) + config.host + (config.port ? ":" + config.port: "") + config.prefix + "resources"
} );

require( ["js/qlik"], function ( qlik ) {
	qlik.setOnError( function ( error ) {
		alert( error.message );
	} );

	global = qlik.getGlobal(config);

	var isPersonalMode;

	global.isPersonalMode(function(reply) {
		isPersonalMode = reply.qReturn;
		qlik.getAppList(function(list) {


			var appList = $('<select />').attr('id', 'app-list').attr('class', 'form-control');
			var label = $('<label>').attr('for', 'selector-content').text('Select App');

			$('#selector-content').append(label).append(appList);

			//creates initial blank option to be selected first in the dropdown
			appList.append('<option value="" hidden></option>');

			//create dropdown options for each item in the applist, using the value attribute as the file name
			list.forEach(function(value) {
				appList.append('<option value="' + value.qDocName +'" guid="' + value.qDocId + '">' + value.qTitle + '</option>');
			});

			//enables the button as soon as something is chosen in the drop down.  Keeps it disabled if dropdown is blank on initial load
			appList.change(function() {
				if($('#app-list option:selected').val() !== '') {
					$('#update-results').attr('disabled', false);
				}
			});

			//when select bar changes options, renderAudit is called on the seleted item's value attribute, ultimately pulling info from selectd app
			$('#update-results').click(function() {
				//clear out any existing tables
				$('#tables').empty();

				var selectedApp = isPersonalMode ? $('#app-list option:selected').val() : $('#app-list option:selected').attr('guid');
				renderAudit(selectedApp);
			});
		},config);

	});

	

//takes in an app name ie hockey.qvf and uses it to open the app.  creates array of measures and array of dimensions
function renderAudit(selectedApp) {
		var app = qlik.openApp(selectedApp, config);

		if($('#sheets-checkbox').is(':checked')){
			app.getAppObjectList(function(reply) {
				console.log(reply);
				tabularizeSheets(reply);
			});
		}

		if($('#measures-checkbox').is(':checked')){
			app.getList('MeasureList', function(reply) {
				tabularize(reply);
			});
		}

		if($('#dimensions-checkbox').is(':checked')){
			app.getList('DimensionList', function(reply) {
				tabularize(reply);
			});
		}

		if($('#bookmarks-checkbox').is(':checked')){
			app.getList('BookmarkList', function(reply) {
				tabularize(reply);
			});
		}

		if($('#fields-checkbox').is(':checked')){
			app.getList('FieldList', function(reply) {
				tabularize(reply);
			});
		}


}

//accepts an array of objects and creates a table displaying measure name and id
function tabularize(list) {
		//get the type of list
		var listType = list.qInfo.qType;

		//use list type to create variable to hold the data array
		var listData = list['q' + listType].qItems;

		//allows for setting of the header depending on type of list passed in since FieldList is structured differently
		var firstHeader;

		var html = '';

		//sets the appropriate header for first column since FieldList does not have qInfo.qType
		if(listType !== "FieldList") {

			//this if check is necessary to remove the word List from the header if the dataset is empty
			if(listData.length === 0) {
				var tempHeader = listType.split('');
				tempHeader = tempHeader.spliced(tempHeader.length - 4, 4);
				firstHeader = tempHeader.join('');
			}
			else firstHeader = listData[0].qInfo.qType;
		}
		else firstHeader = "Field";

		html += '<table class="col-lg-3 col-md-6 col-xs-12 table table-striped">';

		//add the header to the html variable with header labels
		html += "<thead><tr><th>" + firstHeader.toUpperCase() + "</th><th>ID</th></tr></thead>";

		//add the table body
		html += "<tbody>";

		//iterate over array, and populate the table
		if(listData.length === 0){
			html += "<tr><td>Sorry, no data of this type is present in the application</td></tr>";
		}

		//different properties need to be called on the field list object than the others
		if(listType === "FieldList"){
			$.each(listData, function(index, value) {
				html += "<tr><td>" + value.qName + "</td><td>" + "N/A" + "</td></tr>";
			});
		//Since field list is different, everything else will go down this path to populate the tables
		}else{
			$.each(listData, function(index, value) {
				html += "<tr><td>" + value.qData.title + "</td><td>" + value.qInfo.qId + "</td></tr>";
			});
		}

		//close the table body after adding the rows
		html += "</tbody></table>";


		$('#tables').append(html);

	}

	function tabularizeSheets(list) {
		//gets the array of objects - each object represents a sheet
		var sheets = list.qAppObjectList.qItems;
    var totalObjects = 0;
		var html = '';

		//adds the table header row
		html += '<table class="col-lg-3 col-md-6 col-xs-12 table table-striped">';

		//start the table body object
		html += "<tbody>";

    //nexted each loops go through each sheet, then each object in the sheet to create the table
		$.each(sheets, function(index, sheet) {
      html += '<tr><th colspan="2" style="padding-top:5px;"><b>Sheet</b> - ' + sheet.qMeta.title + '</th></tr>' + '<tr><th>Type</th><th>ID</th></tr>';

      $.each(sheet.qData.cells, function(index, object) {
        html += '<tr><td>' + object.type + '</td><td>' + object.name + '</td></tr>';
        totalObjects++;
      });
		});

		//close out table body and start table footer
		html += "</tbody>";

		//create the footer row showing the the total objects
		html += '<tr><td><b>TOTAL OBJECTS</b></td><td align="right">' + totalObjects + '</td></tr></tfoot></table>';

		$('#tables').append(html);
	}


});

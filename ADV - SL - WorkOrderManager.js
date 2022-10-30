/**
*@NApiVersion 2.1
*@NScriptType Suitelet
*@author Jacob Howe
*
*   Date: 2021-10-08
*	Title: Work Order Manager
*	Purpose: Suitelet to allow a user to update Work Orders
*   Request: BSD-55795
*/


define(['N/https','N/record','N/search','N/https','N/url','/SuiteScripts/oauth', '/SuiteScripts/secret', 'N/runtime', 'N/task', 'N/ui/serverWidget'],
    function(https,record,search, https, url, oauth, secret, runtime, task, serverWidget) {


        function onRequestFxn(context) {
			var script = runtime.getCurrentScript();
            
			var currentuser = runtime.getCurrentUser();
			log.debug("Context", context.request);
			
			var method = context.request.method;
			log.debug('Method', method);
			if (method == "POST") {
				log.debug("POST Request", context.request.body);
				var woNums = context.request.parameters.woNums;
				var count =  woNums.split(',').length;
				var requestor = context.request.parameters.requestors;
				var originalRequestor = context.request.parameters.originalRequestors;
				var quantity = context.request.parameters.quantities;
				var startTranDate = context.request.parameters.startTranDates;
				var endTranDate = context.request.parameters.endTranDates;
				var memo = context.request.parameters.memos;
				log.debug("requestor", requestor);
				log.debug("originalRequestor", originalRequestor);
				log.debug("woNums", count);
				
				
					if(count <= 5){
						var splitWoNums =  woNums.split(',');
						var splitRequestors =  requestor.split(',');
						var splitQuantities =  quantity.split(',');
						var splitStartTranDates =  startTranDate.split(',');
						var splitEndTranDate =  endTranDate.split(',');
						var splitOriginalRequestor =  originalRequestor.split(',');
						var splitMemo =  memo.split(',');
						for(var i = 0; i < count - 1; i++){
							var params = {};
							
							if(!!splitRequestors[i] && splitOriginalRequestor[i] != splitRequestors[i]){
								log.debug('New Requestor', 'New Requestor');
								var employeeLookup = search.lookupFields({
									type: search.Type.EMPLOYEE,
									id: splitRequestors[i],
									columns: ['isinactive']
								});
								
								if(!employeeLookup.isinactive){
									params.custbody_adv_wo_requestor = parseInt(splitRequestors[i]);
								}
							}
							var splitStartDate = splitStartTranDates[i].split('-');
							var newStartDate =  splitStartDate[1] + '/' + splitStartDate[2] + '/' + splitStartDate[0];
							var splitEndDate = splitEndTranDate[i].split('-');
							var newEndDate =  splitEndDate[1] + '/' + splitEndDate[2] + '/' + splitEndDate[0];
							params.startdate = newStartDate;
							params.enddate = newEndDate;
							params.quantity = splitQuantities[i];
							params.memo = splitMemo[i];
							
							
							
							var submitId = record.submitFields({
								type: 'workorder',
								id: splitWoNums[i],
								values: 
									params,
								options: {
									ignoreMandatoryFields : true
								}
							});
						}
					}
					else if(count > 5){
				
					  var objTask = task.create({
								scriptId: 'customscript_adv_mr_workordrmanagupd',
								deploymentId: 'customdeploy_adv_mr_workordrmanagupd',
								taskType: task.TaskType.MAP_REDUCE,
								params: {
									custscript_woid : woNums,
									custscript_requestor: requestor, 
									custscript_quantity: quantity, 
									custscript_startTranDate: startTranDate, 
									custscript_endTranDate: endTranDate,
									custscript_originalRequestor: originalRequestor,
									custscript_memo: memo,
								},
							}).submit();
						log.debug('task', objTask);
					}
				
			}
			else{
			
			
			var params = context.request.parameters;
			log.debug('Params', params);
			log.debug('params.dataSubmitted', params.dataSubmitted);
			
			var suiteletUrl = url.resolveScript({
				scriptId: 'customscript_adv_sl_workordermanager',
				deploymentId: 'customdeploy_adv_sl_workordermanager',
				returnExternalUrl: false
			});
			
			
			var woSearchObj = search.create({
			   type: "workorder",
			   filters:
			   [
				["type","anyof","WorkOrd"], 
			    "AND", 
			    ["mainline","is","T"],
			   ],
			   columns:
			   [
				  search.createColumn({name: "tranid", label: "Document Number"}),
				  search.createColumn({name: "item", label: "Item"}),
				  search.createColumn({name: "custbody_adv_assem_build_itemdesc", label: "Assembly Build Item Description"}),
				  search.createColumn({name: "itemrevision", label: "Item Revision"}),
				  search.createColumn({name: "quantity", label: "Quantity"}),
				  search.createColumn({name: "startdate", label: "Start Date", sort: search.Sort.ASC,}),
				  search.createColumn({name: "enddate", label: "End Date"}),
				  search.createColumn({name: "memo", label: "Memo"}),
				  search.createColumn({name: "statusref", label: "Status"}),
				  search.createColumn({name: "custbody_adv_wo_requestor", Label: "Requestor"}),
				  search.createColumn({name: "internalid", Label: "Internal ID"}),
				  search.createColumn({name: "location", Label: "Location"}),
				  search.createColumn({name: "built", Label: "Built"}),
			   ]
			});
			var itemId;
			var itemName;
			
			woSearchObj.filters = CreateFilters(params, woSearchObj.filters, params.itemNum);
			var woSearchCounter = woSearchObj.runPaged().count;
			
			
			
			
			var html = '<!DOCTYPE HTML>\
					<html lang="en">\
<head>\
	<meta charset="UTF-8">\
	<title>Work Order Manager</title>\
	<link rel="stylesheet" href="https://newton.advantus.com/LPManager/dist/themes/default/style.min.css" />\
	<link rel="stylesheet" href="https://newton.advantus.com/OutsideShipmentManager/adv-osm-base.css" />\
	<link rel="stylesheet" href="https://cdn.datatables.net/1.11.1/css/jquery.dataTables.min.css" />\
	<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>\
	<script src="https://cdn.datatables.net/1.11.1/js/jquery.dataTables.min.js"></script>\
	<script>function ReplaceString(text){\
		return text;\
	}\
	</script>\
	<script>\
		jQuery(document).ready(function() {\
			$("#clearFilters").on("click", function(){		\
				window.open("'+suiteletUrl+'", "_self");\
			});	\
		});\
		jQuery(document).ready( function () {\
			jQuery("#applyFilters").on("click", function(){';
			html += ApplyFilters(suiteletUrl);
			html += '});	\
		} );\
		jQuery(document).ready( function () {\
			jQuery("#bulkUpdate").on("click", function(){';
			html += ApplyBulkUpdate(woSearchCounter);
			html += '});	\
		} );\
		jQuery(document).ready( function () {\
			var table = jQuery("#myTable").DataTable({\
    aLengthMenu: [\
        [25, 50, 100, 200, -1],\
        [25, 50, 100, 200, "All"]\
    ],\
    iDisplayLength: -1,\
	searching: false,\
	paging: false,\
	"columnDefs": [ {\
	"targets": 0,\
	} ],\
	"order": [[ 7, "asc" ]]\
});\
			jQuery("#submitChanges").on("click", function(){';
			html += SubmitChanges(woSearchCounter, suiteletUrl,params);
			html += '});	\
		} )\
	</script>\
</head>\
<body>\
	<div id="lpm-title"><table width="100%"><tr><td width="50%" align="left">Work Order Manager</td><td width="50%" align="right" style="font-size:10pt; font-weight:bold;"><a style="color:#ffffff" href="javascript:window.history.back();">&lt;&lt; back</a></td></tr></table></div>\
	<div id="lpm-menu">\
	Filters:<br/>';
	html += GetFilterRequestors(params, false);
	html += ' Item # <input type="text" name="itemNum" id="itemNum" /> \
	<script>var temp = "" + "' + params.itemNum + '";\
			if(temp != "undefined"){\
			document.getElementById("itemNum").defaultValue  = temp;}\
			</script>';
	html += 'Start Order # <input type="text" name="startOrdNum" id="startOrdNum" /> \
	<script>var temp = ' + params.startOrdNum + ';\
			if(!!temp){\
			document.getElementById("startOrdNum").defaultValue  = temp;}\
			</script>\
	End Order # <input type="text" name="endOrdNum" id="endOrdNum" />\
	<script>var temp = ' + params.endOrdNum + ';\
			if(!!temp){\
			document.getElementById("endOrdNum").defaultValue  = temp;}\
			</script>';
	html += GetLocations(params);
	html += '</br>';
	html += 'From Trandate <input type="date" name="startTranDate" id="startTranDate"  /> \
	<script>var temp = new Date("' + params.startTranDate + '");\
			if(!!temp){\
			document.getElementById("startTranDate").valueAsDate   = temp;}\
			</script>\
	To Trandate <input type="date" name="endTranDate" id="endTranDate"  /> \
	<script>var temp =  new Date("' + params.endTranDate + '");\
			if(!!temp){\
			document.getElementById("endTranDate").valueAsDate  = temp;}\
			</script>\
	From Production Start Date <input type="date" name="startProdStartDate" id="startProdStartDate"  /> \
	<script>var temp =  new Date("' + params.startProdStartDate + '");\
			if(!!temp){\
			document.getElementById("startProdStartDate").valueAsDate  = temp;}\
			</script>\
	To Production Start Date <input type="date" name="endProdStartDate" id="endProdStartDate"  /> \
	<script>var temp =  new Date("' + params.endProdStartDate + '");\
			if(!!temp){\
			document.getElementById("endProdStartDate").valueAsDate  = temp;}\
			</script>\
	From Production End Date <input type="date" name="startProdEndDate" id="startProdEndDate"  /> \
	<script>var temp =  new Date("' + params.startProdEndDate + '");\
			if(!!temp){\
			document.getElementById("startProdEndDate").valueAsDate  = temp;}\
			</script>\
	To Production End Date <input type="date" name="endProdEndDate" id="endProdEndDate"  /> \
	<script>var temp =  new Date("' + params.endProdEndDate + '");\
			if(!!temp){\
			document.getElementById("endProdEndDate").valueAsDate  = temp;}\
			</script>\
	</br>\
	&nbsp;<input type="button" name="applyFilters" id="applyFilters" value="Apply Filters"  />\
	&nbsp;<input type="button" name="clearFilters" id="clearFilters" value="Clear Filters"/></br></br>';
	
	html += 'Bulk Update:</br>';
	html += GetFilterRequestors(params, true);
	html += 'Quantity <input type="number" name="quantityBulk" id="quantityBulk"  />';
	html += 'Production Start Date <input type="date" name="productionStartDateBulk" id="productionStartDateBulk"  /> \
	Production End Date <input type="date" name="productionEndDateBulk" id="productionEndDateBulk"  /> \
	Memo <input type="text" name="memoBulk" id="memoBulk"  /> \
	</br>\
	&nbsp;<input type="button" name="bulkUpdate" id="bulkUpdate" value="Apply Bulk Update"/></br>&nbsp;<input type="button" name="submitChanges" id="submitChanges" value="Submit Changes" onclick=""  />';
	
	if (!!params.obsid) {
		html += ' &nbsp;&nbsp;&nbsp;<a href="javascript:clearFilter();">clear shipment filter</a>';
	}
	html += '</div><table id="myTable" class="display">\
		<thead>\
			<tr>\
				<th><input type="checkbox" name="selectAll" id="selectAll" value="selectAll"/></th>\
				<th>WO #</th>\
				<th>Requestor</th>\
				<th>Item</th>\
				<th>Item Desc</th>\
				<th>Quantity</th>\
				<th>Built</th>\
				<th>Prod Start Date</th>\
				<th>Prod End Date</th>\
				<th>Location</th>\
				<th>Comment (Memo)</th>\
				<th>Status</th>\
			</tr>\
		</thead>\
		<tbody>';
		var myStatus;
		var myPro = '';
		var myLoad = '';
		var myShipVia = 0;
		var myFreightCost = '';
		var mySealNum = '';
		var myTrailerNum = '';
		var myCtnLabelUrl;
		var myPltLabelUrl;
		var myPltPlacardUrl;
		var myPltBuildSummaryUrl;
		
		
		var index = 0;
		var employeeSearch = search.create({
			   type: "employee",
			   filters:
			   [
				
			   ],
			   columns:
			   [
				  search.createColumn({
					 name: "entityid",
					 sort: search.Sort.ASC,
					 label: "Name"
				  }),
				  'internalid',
			   ]
			});
	var employeeChoices ='';
		employeeSearch.run().each(function(result) {
				
				employeeChoices += '<option value="' + result.getValue({name: 'internalid'}) + '">' + result.getValue({name: 'entityid'}) + '</option>'
				return true;
			});
		woSearchObj.run().each(function(result) {
			html += '<tr name="row' + index + '" id="row' + index + '">' + 
						'<td><input type="checkbox" name="select' + index + '" id="select' + index + '" value="'+result.id+'" ';
						
						
			
			
			
			html +=	'/></td>' + 
						'<td name="'+ result.getValue({name: 'internalid'}) + '" id="woID' + index + '">'+result.getValue({name: 'tranid'}) + '</td>' +
						'<td>'+ GetTableRequestors(employeeChoices, result.getText({name: 'custbody_adv_wo_requestor'}), index) + '<input type="text" hidden id="originalRequestor' + index + '" name="originalRequestor' + index + '" value = "' + result.getValue({name: 'custbody_adv_wo_requestor'}) + '"></td>' +
						'<td>'+result.getText({name: 'item'}) + '</td>' +
						'<td>'+result.getValue({name: 'custbody_adv_assem_build_itemdesc'}) + '</td>' +
						'<td><input type="number" name="quantity' + index + '" id="quantity' + index + '" value="'+ result.getValue({name: 'quantity'}) + '"/><p hidden  id="hiddenQuantity' + index + '" name="hiddenQuantity' + index + '">' +result.getValue({name: 'quantity'}) + '</p></td>' +
						'<td  name="built' + index + '" id="built' + index + '">' + result.getValue({name: "built"}) + '</td>' +
						'<td><input type="date" name="startTranDate' + index + '" id="startTranDate' + index + '" value="'+ TranslateDate(result.getValue({name: 'startdate'})) + '"/><p hidden id="hiddenStartdate' + index + '" name="hiddenStartdate' + index + '">' +TranslateDate(result.getValue({name: 'startdate'})) + '</p></td>' +
						'<td><input type="date" name="endTranDate' + index + '" id="endTranDate' + index + '" value="'+ TranslateDate(result.getValue({name: 'enddate'})) + '"/><p hidden id="hiddenEnddate' + index + '" name="hiddenEnddate' + index + '">' +TranslateDate(result.getValue({name: 'enddate'})) + '</p></td>' +
						'<td>'+result.getText({name: 'location'}) + '</td>' +
						'<td><input type="text" name="memo' + index + '" id="memo' + index + '" value="'+ result.getValue({name: 'memo'}) + '"/><p hidden id="hiddenMemo' + index + '" name="hiddenMemo' + index + '">' +result.getValue({name: 'memo'}) + '</p></td>' +
						'<td>'+result.getText({name: 'statusref'}) + ' </td>' +
					'</tr>';
			html += '<script>\
				var requestorSelect = document.getElementById("requestor' + index + '");\
				var quantitySelect = document.getElementById("quantity' + index + '");\
				var startDateSelect = document.getElementById("startTranDate' + index + '");\
				var endDateSelect = document.getElementById("endTranDate' + index + '");\
				var memoSelect = document.getElementById("memo' + index + '");\
				requestorSelect.addEventListener("change", (event) => {\
					document.getElementById("select' + index +'").checked=true;\
				});\
				quantitySelect.addEventListener("change", (event) => {\
					document.getElementById("select' + index +'").checked=true;\
					document.getElementById("hiddenQuantity' + index +'").innerHTML=document.getElementById("quantity' + index + '").value;\
					$("#myTable").DataTable().rows().invalidate();\
				});\
				startDateSelect.addEventListener("change", (event) => {\
					document.getElementById("select' + index +'").checked=true;\
					var tempDate = document.getElementById("startTranDate' + index + '").value.split("-");\
					var date = tempDate[1] + "/" + tempDate[2] + "/" + tempDate[0];\
					document.getElementById("hiddenStartdate' + index +'").innerHTML= document.getElementById("startTranDate' + index + '").value;\
					$("#myTable").DataTable().rows().invalidate();\
				});\
				endDateSelect.addEventListener("change", (event) => {\
					document.getElementById("select' + index +'").checked=true;\
					var tempDate = document.getElementById("startTranDate' + index + '").value.split("-");\
					var date = tempDate[1] + "/" + tempDate[2] + "/" + tempDate[0];\
					document.getElementById("hiddenEnddate' + index +'").innerHTML= document.getElementById("endTranDate' + index + '").value;\
					$("#myTable").DataTable().rows().invalidate();\
				});\
				memoSelect.addEventListener("change", (event) => {\
					document.getElementById("select' + index +'").checked=true;\
					document.getElementById("hiddenMemo' + index +'").innerHTML=document.getElementById("memo' + index + '").value;\
					$("#myTable").DataTable().rows().invalidate();\
				});\
			</script>';	
			
			html += '<script>\
				var selectAll = document.getElementById("selectAll");\
				selectAll.addEventListener("change", (event) => {\
				  if (event.currentTarget.checked) {\
						document.getElementById("select' + index +'").checked=true;\
				  } else {\
						document.getElementById("select' + index +'").checked=false;\
				  }\
				});\
				</script>';
				log.debug('statusref', result.getText({name: 'statusref'}));
				if(result.getText({name: 'statusref'}) == 'In Process' || result.getText({name: 'statusref'}) == 'Built' || result.getText({name: 'statusref'}) == 'Released' ){
					html += '<script>\
					document.getElementById("quantity' + index +'").disabled=true;\
					document.getElementById("endTranDate' + index +'").disabled=true;\
					</script>';
				}
				
				if(result.getText({name: 'statusref'}) == 'Built' ){
					html += '<script>\
					document.getElementById("requestor' + index +'").disabled=true;\
					document.getElementById("startTranDate' + index +'").disabled=true;\
					</script>';
				}
				
				
									
					
			index++;
			
			return true;
		});
		
			var index2 = 0;
			
			
		html += '</tbody>\
	</table>';
			if(!!params.dataSubmitted){
				if(parseInt(params.dataSubmitted) > 5){
					html += '<script>alert("Your changes have been submitted. Depending on the size of the update, it may take some time before the changes are reflected.");</script>'
				}
				else if (parseInt(params.dataSubmitted) < 5 && parseInt(params.dataSubmitted) > 0){
					html += '<script>alert("Your changes have been submitted");</script>'
				}
				else if (parseInt(params.dataSubmitted) == -1){
					html += '<script>alert("Your changes were NOT submitted. Either another request is being processed or there was an issue with the request. Please try again later. If the issue persists, please contact IT.");</script>'
				}
			}
	
	
html += '</body>\
</html>';

            context.response.write(html);
			}
        }

		
		function CreateFilters(params, filters, itemId){
			if(!params.requestor && (!params.startOrdNum || !params.endOrdNum) && !params.loc && !itemId){
				searchFilter = search.createFilter({
					 name: "location",
					 operator: search.Operator.ANYOF,
					 values:-1
				 });
				filters.push(searchFilter); 
			}
			 var searchFilter = search.createFilter({
                 name: "custbody_adv_order_release_status",
                 operator: search.Operator.NONEOF,
                 values: ["3"]
             });
			if(!!itemId){
				  var searchFilter = search.createFilter({
					 name: "name",
					 operator: search.Operator.STARTSWITH,
					 join: 'item',
					 values: [itemId]
				 });
				filters.push(searchFilter);
			}
			
			 var searchFilter = search.createFilter({
                 name: "status",
                 operator: search.Operator.NONEOF,
                 values: ["WorkOrd:C","WorkOrd:G","WorkOrd:H"]
             });
            filters.push(searchFilter);
			if(!!params.requestor){
				searchFilter = search.createFilter({
					 name: "custbody_adv_wo_requestor",
					 operator: search.Operator.ANYOF,
					 values:params.requestor
				 });
				filters.push(searchFilter); 
			}			
			if(!params.endOrdNum){
				params.endOrdNum = params.startOrdNum;
			}
			else if(!params.startOrdNum){
				params.startOrdNum = params.endOrdNum;
			}
			
			if(!!params.startOrdNum && !! params.endOrdNum){
				
				searchFilter = search.createFilter({
					 name: "number",
					 operator: search.Operator.BETWEEN,
					 values:[params.startOrdNum, params.endOrdNum]
				 });
				 filters.push(searchFilter);  
			}
			if(!!params.loc){
				searchFilter = search.createFilter({
					 name: "location",
					 operator: search.Operator.ANYOF,
					 values:params.loc
				 });
				filters.push(searchFilter);  
			}
			var endTranDate = params.endTranDate;
			var startTranDate = params.startTranDate;
			if(!endTranDate){
				endTranDate = params.startTranDate;
			}
			else if(!startTranDate){
				startTranDate = params.endTranDate;
			}
			if(!!startTranDate && !! endTranDate){
				
				var tempDate = startTranDate.split("-");
				var newDate = tempDate[1] + "/" + tempDate[2] + "/" + tempDate[0];
				var tempDate2 = endTranDate.split("-");
				var newDate2 = tempDate2[1] + "/" + tempDate2[2] + "/" + tempDate2[0];
				searchFilter = search.createFilter({
					 name: "trandate",
					 operator: search.Operator.WITHIN,
					 values: [newDate, newDate2]
				 });
				filters.push(searchFilter);			
			}
			var endProdStartDate = params.endProdStartDate;
			var startProdStartDate = params.startProdStartDate;
			if(!endProdStartDate){
				endProdStartDate = params.startProdStartDate;
			}
			else if(!startProdStartDate){
				startProdStartDate = params.endProdStartDate;
			}
			if(!!startProdStartDate && !! endProdStartDate){
				var tempDate = startProdStartDate.split("-");
				var newDate = tempDate[1] + "/" + tempDate[2] + "/" + tempDate[0];
				var tempDate2 = endProdStartDate.split("-");
				var newDate2 = tempDate2[1] + "/" + tempDate2[2] + "/" + tempDate2[0];
				searchFilter = search.createFilter({
					 name: "startdate",
					 operator: search.Operator.WITHIN,
					 values: [newDate, newDate2]
				 });
				filters.push(searchFilter);  
			}
			var endProdEndDate = params.endProdEndDate;
			var startProdEndDate = params.startProdEndDate;
			if(!endProdEndDate){
				endProdEndDate = params.startProdEndDate;
			}
			else if(!startProdEndDate){
				startProdEndDate = params.endProdEndDate;
			}
			if(!!startProdEndDate && !! endProdEndDate){
				var tempDate = startProdEndDate.split("-");
				var newDate = tempDate[1] + "/" + tempDate[2] + "/" + tempDate[0];
				var tempDate2 = endProdEndDate.split("-");
				var newDate2 = tempDate2[1] + "/" + tempDate2[2] + "/" + tempDate2[0];
				searchFilter = search.createFilter({
					 name: "enddate",
					 operator: search.Operator.WITHIN,
					 values: [newDate, newDate2]
				 });
				filters.push(searchFilter);
			}
			return filters;
			 
		}
		
		function GetLocations(params){
			var locationSearchObj = search.create({
			   type: "location",
			   filters:
			   [
				
			   ],
			   columns:
			   [
				  search.createColumn({
					 name: "name",
					 sort: search.Sort.ASC,
					 label: "Name"
				  }),
				  'internalid',
			   ]
			});
			var idName = 'loc';
			var locationString = '<label for="loc">Location </label><select id="loc" name="loc">';
				locationString += '<option value=""></option>'
			
			locationSearchObj.run().each(function(result) {
				
				locationString += '<option value=' + result.getValue({name: 'internalid'}) + '>' + result.getValue({name: 'name'}) + '</option>'
				return true;
			});
			locationString += '</select>';
				locationString += '<script>var temp = ' + params.loc + ';\
				var mySelect = document.getElementById("loc");\
				for(var i, j = 0; i = mySelect.options[j]; j++) {\
					if(i.value == temp) {\
						mySelect.selectedIndex = j;\
						break;\
					}\
				}\
				</script>'
			
			return locationString;
	
		}
		
		function GetTableRequestors(employeeChoices, requestor, rowNum){
			
			var employeeString = '<label for="requestor' + rowNum + '"></label><select id="requestor' + rowNum + '" name="requestor' + rowNum + ' ">';
				employeeString += employeeChoices;
	
			employeeString += '</select>';
			employeeString += '<script>var temp = "' + requestor + '";\
			var mySelect = document.getElementById("requestor' + rowNum + '");\
			for(var i, j = 0; i = mySelect.options[j]; j++) {\
				if(i.innerHTML == temp) {\
					mySelect.selectedIndex = j;\
					break;\
				}\
			}\
			</script>';
			
			
			return employeeString;
		}
		
			function GetFilterRequestors(params, isBulk){
			var employeeSearch = search.create({
			   type: "employee",
			   filters:
			   [
				["isinactive","is","f"], 
			   ],
			   columns:
			   [
				  search.createColumn({
					 name: "entityid",
					 sort: search.Sort.ASC,
					 label: "Name"
				  }),
				  'internalid',
			   ]
			});
			
			var idName = 'requestor';
			if(isBulk){
				idName += 'Bulk';
			}
			var employeeString = '<label for="' + idName + '">Requestor </label><select id="' + idName + '" name="' + idName + '">';
			employeeString += '<option value=""></option>'
				
	
			employeeSearch.run().each(function(result) {
				
				employeeString += '<option value="' + result.getValue({name: 'internalid'}) + '">' + result.getValue({name: 'entityid'}) + '</option>'
				return true;
			});
			employeeString += '</select>';
			if(!isBulk){
				employeeString += '<script>var temp = ' + params.requestor + ';\
				var mySelect = document.getElementById("requestor");\
				for(var i, j = 0; i = mySelect.options[j]; j++) {\
					if(i.value == temp) {\
						mySelect.selectedIndex = j;\
						break;\
					}\
				}\
				</script>'
			}
			
			
			return employeeString;
		}
		
		function test(){
			console.log('test');
		}
		
		function ClearFilters(url){
			window.open(url);
		}
		
		function ApplyFilters(suiteletUrl){
			
			var htmlString = 'var suiteletURL = "' + suiteletUrl + '";\
			if(!!document.getElementById("requestor").value){\
				suiteletURL += "&requestor="+ReplaceString(document.getElementById("requestor").value);\
			}\
			if(!!document.getElementById("itemNum").value){\
				suiteletURL += "&itemNum="+ReplaceString(document.getElementById("itemNum").value);\
			}\
			if(!!document.getElementById("startOrdNum").value){\
				suiteletURL += "&startOrdNum="+ReplaceString(document.getElementById("startOrdNum").value);\
			}\
			if(!!document.getElementById("endOrdNum").value){\
				suiteletURL += "&endOrdNum="+ReplaceString(document.getElementById("endOrdNum").value);\
			}\
			if(!!document.getElementById("loc").value){\
				suiteletURL += "&loc="+ReplaceString(document.getElementById("loc").value);\
			}\
			if(!!document.getElementById("startTranDate").value){\
				suiteletURL += "&startTranDate="+document.getElementById("startTranDate").value;\
			}\
			if(!!document.getElementById("endTranDate").value){\
				suiteletURL += "&endTranDate="+document.getElementById("endTranDate").value;\
			}\
			if(!!document.getElementById("startProdStartDate").value){\
				suiteletURL += "&startProdStartDate="+document.getElementById("startProdStartDate").value;\
			}\
			if(!!document.getElementById("endProdStartDate").value){\
				suiteletURL += "&endProdStartDate="+document.getElementById("endProdStartDate").value;\
			}\
			if(!!document.getElementById("startProdEndDate").value){\
				suiteletURL += "&startProdEndDate="+document.getElementById("startProdEndDate").value;\
			}\
			if(!!document.getElementById("endProdEndDate").value){\
				suiteletURL += "&endProdEndDate="+document.getElementById("endProdEndDate").value;\
			}';
			
			htmlString += 'window.open(suiteletURL, "_self");'
			return htmlString;
			
			
			}
		
		function SubmitChanges(woCount, suiteletUrl, params){
			
			var htmlText = '';
			htmlText += 'var woNumList="";';
			htmlText += 'var requestorList="";';
			htmlText += 'var originalRequestorList="";';
			htmlText += 'var quantityList="";';
			htmlText += 'var startDateList="";';
			htmlText += 'var endDateList="";';
			htmlText += 'var memoList="";';
			htmlText += 'var hasError=false;';
			htmlText += 'var errorMessage="";';
			htmlText += 'var noWOSelected=false;';
			htmlText += 'var count=0;';
			for(var i=0; i < woCount; i++){
				htmlText += 'var select = document.getElementById("select' + i + '").checked;';
				htmlText += 'var woNums = document.getElementById("woID' + i + '").getAttribute("name");';
				htmlText += 'var woNames = document.getElementById("woID' + i + '").innerHTML;';
				htmlText += 'var requestor = document.getElementById("requestor' + i + '").value;';
				htmlText += 'var startTranDate = document.getElementById("startTranDate' + i + '").value;';
				htmlText += 'var quantity = document.getElementById("quantity' + i + '").value;';
				htmlText += 'var built = document.getElementById("built' + i + '").innerHTML;';
				htmlText += 'var endTranDate = document.getElementById("endTranDate' + i + '").value;';
				htmlText += 'var originalRequestor = document.getElementById("originalRequestor' + i + '").value;';
				htmlText += 'var memo = document.getElementById("memo' + i + '").value;';
				htmlText += 'if(parseInt(quantity) < parseInt(built) && select){hasError=true;errorMessage += woNames + "  " + quantity + "  " + built + " " + "has a quantity less than the built amount. Please correct this before submitting.";}'
				htmlText += 'if((!woNums || !requestor || (quantity == "" || parseInt(quantity) < 0) || !startTranDate || !endTranDate || !originalRequestor || (endTranDate < startTranDate)) && select){hasError=true;errorMessage += woNames + " has an issue with one or more of its fields. Please verify and try again.";}';
				htmlText += 'if(select){woNumList+=woNums + ",";quantityList+=quantity + ",";startDateList+=startTranDate + ",";endDateList+=endTranDate + ",";requestorList+=requestor+"," ;originalRequestorList+=originalRequestor+","; memoList+=memo+","; count +=1;}';	
			}
				htmlText += 'if(woNumList==""){noWOSelected=true;}';
			
			htmlText += 'var suiteletURL = "' + suiteletUrl +'"; console.log(memoList);\
			if(!!document.getElementById("requestor").value){\
				suiteletURL += "&requestor="+ReplaceString(document.getElementById("requestor").value);\
			}\
			if(!!document.getElementById("startOrdNum").value){\
				suiteletURL += "&startOrdNum="+ReplaceString(document.getElementById("startOrdNum").value);\
			}\
			if(!!document.getElementById("endOrdNum").value){\
				suiteletURL += "&endOrdNum="+ReplaceString(document.getElementById("endOrdNum").value);\
			}\
			if(!!document.getElementById("loc").value){\
				suiteletURL += "&loc="+ReplaceString(document.getElementById("loc").value);\
			}\
			if(!!document.getElementById("startTranDate").value){\
				suiteletURL += "&startTranDate="+document.getElementById("startTranDate").value;\
			}\
			if(!!document.getElementById("endTranDate").value){\
				suiteletURL += "&endTranDate="+document.getElementById("endTranDate").value;\
			}\
			if(!!document.getElementById("startProdStartDate").value){\
				suiteletURL += "&startProdStartDate="+document.getElementById("startProdStartDate").value;\
			}\
			if(!!document.getElementById("endProdStartDate").value){\
				suiteletURL += "&endProdStartDate="+document.getElementById("endProdStartDate").value;\
			}\
			if(!!document.getElementById("startProdEndDate").value){\
				suiteletURL += "&startProdEndDate="+document.getElementById("startProdEndDate").value;\
			}\
			if(!!document.getElementById("endProdEndDate").value){\
				suiteletURL += "&endProdEndDate="+document.getElementById("endProdEndDate").value;\
			}';
			htmlText += 'suiteletURL += "&dataSubmitted=t";';
			htmlText+='if(hasError){alert(errorMessage);}else if(noWOSelected){alert("No Work Orders were selected.");}else{';
			htmlText+= 'if(confirm("Are you sure you want to submit selected lines?")){document.getElementById("submitChanges").disabled=true;'
			htmlText+='$.ajax({\
					type: "POST",\
					url: suiteletURL,\
					data: {\
						woNums: woNumList,\
						requestors: requestorList,\
						quantities: quantityList,\
						startTranDates: startDateList,\
						endTranDates: endDateList,\
						originalRequestors: originalRequestorList,\
						memos: memoList,\
						},\
					success: function(data) {\
						$("#endpointResponse").html(data);\
						urlParams = new URLSearchParams(window.location.search);\
						urlParams.set("dataSubmitted", count);\
						window.location.search = urlParams;\
					},\
					error: function(data){\
						$("#endpointResponse").html(data);\
						urlParams = new URLSearchParams(window.location.search);\
						urlParams.set("dataSubmitted", -1);\
						window.location.search = urlParams;\
					},\
					async:false\
			})}}';
				return htmlText;
		}
		
		
		function ApplyBulkUpdate(woCount){
			var htmlText ='';
			for(var i=0; i < woCount; i++){
				htmlText += 'var select = document.getElementById("select' + i + '").checked;';
				htmlText += 'if(select){\
				if(!!document.getElementById("requestorBulk").value){document.getElementById("requestor' + i + '").value = document.getElementById("requestorBulk").value;}\
				if(!!document.getElementById("quantityBulk").value){document.getElementById("quantity' + i + '").value = document.getElementById("quantityBulk").value;}\
				if(!!document.getElementById("productionStartDateBulk").value){document.getElementById("startTranDate' + i + '").value = document.getElementById("productionStartDateBulk").value;}\
				if(!!document.getElementById("productionEndDateBulk").value){document.getElementById("endTranDate' + i + '").value = document.getElementById("productionEndDateBulk").value};\
				if(!!document.getElementById("memoBulk").value){document.getElementById("memo' + i + '").value = document.getElementById("memoBulk").value};}';	
				
				}
			return htmlText;
		}
		
		function TranslateDate(date){
			
			var splitDate = date.split('/');
			var year = splitDate[2];
			var month = splitDate[0] ;
			if(parseInt(month) < 10){
				month = '0' + month.toString();
			}
			var day = splitDate[1];
			if(parseInt(day) < 10){
				day = '0' + day.toString();
			}
			return (year + '-' + month + '-' + day);
			
		}


        return {
			onRequest: onRequestFxn 
        };
    }
);
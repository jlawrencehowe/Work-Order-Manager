/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 * author: Jacob Howe
 * Date: 2022-06-10
 * Version: 1.0
 * Purpose: Map Reduce script that is invoked by ADV - SL - WorkOrderManager
 */


define(['N/record', 'N/search', 'N/runtime', 'N/email', './sshelper-server.js'],

    /**
     * @param {record} record
     * @param {search} search
     */
    function (record, search, runtime, email, helper) {

        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 2015.1
         */
		
		
        function getInputData() {
			var woNums = runtime.getCurrentScript().getParameter({name:"custscript_woid"});
			var requestors = runtime.getCurrentScript().getParameter({name:"custscript_requestor"});
			var quantities = runtime.getCurrentScript().getParameter({name:"custscript_quantity"});
			var startTranDates = runtime.getCurrentScript().getParameter({name:"custscript_startTranDate"});
			var endTranDate = runtime.getCurrentScript().getParameter({name:"custscript_endTranDate"});
			var originalRequestor = runtime.getCurrentScript().getParameter({name:"custscript_originalRequestor"});
			var memo = runtime.getCurrentScript().getParameter({name:"custscript_memo"});
			var splitWoNums =  woNums.split(',');
			var splitRequestors =  requestors.split(',');
			var splitQuantities =  quantities.split(',');
			var splitStartTranDates =  startTranDates.split(',');
			var splitEndTranDate =  endTranDate.split(',');
			var splitOriginalRequestor =  originalRequestor.split(',');
			var splitMemo =  memo.split(',');
            
			var data=[];
			
			for(var i = 0; i < splitWoNums.length - 1; i++){
				var tempData = {};
				tempData["woNum"] = splitWoNums[i];
				tempData["requestors"] = splitRequestors[i];
				tempData["quantities"] = splitQuantities[i];
				tempData["startTranDates"] = splitStartTranDates[i];
				tempData["endTranDate"] = splitEndTranDate[i];
				tempData["originalRequestor"] = splitOriginalRequestor[i];
				tempData["memo"] = splitMemo[i];
				data[i] = tempData;
			}
			
			
			return data;
        }

        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         */
        function map(context) {
            log.debug("ctx", JSON.stringify(context));
			var ctxVal = JSON.parse(context.value);
			var params = {};
			if(!!ctxVal.requestors && ctxVal.originalRequestor != ctxVal.requestors){
				log.debug('New Requestor', 'New Requestor');
				var employeeLookup = search.lookupFields({
					type: search.Type.EMPLOYEE,
					id: ctxVal.requestors,
					columns: ['isinactive']
				});
				
				if(!employeeLookup.isinactive){
					params.custbody_adv_wo_requestor = parseInt(ctxVal.requestors);
				}
			}
			var splitStartDate = ctxVal.startTranDates.split('-');
			var newStartDate =  splitStartDate[1] + '/' + splitStartDate[2] + '/' + splitStartDate[0];
			var splitEndDate = ctxVal.endTranDate.split('-');
			var newEndDate =  splitEndDate[1] + '/' + splitEndDate[2] + '/' + splitEndDate[0];
			params.startdate = newStartDate;
			params.enddate = newEndDate;
			params.quantity = ctxVal.quantities;
			params.memo = ctxVal.memo;
			log.debug('params', params);
				var recordSubmit = record.submitFields({
					type: 'workorder',
					id: ctxVal.woNum,
					values: 
						params,
					options: {
						ignoreMandatoryFields : true
					}
				});
        }

        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @since 2015.1
         */
        function summarize(summary) {
           log.debug('done', 'done');
			
        }


        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        }
    }
);
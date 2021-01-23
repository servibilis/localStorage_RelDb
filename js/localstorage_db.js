

/* need write test on overflow localStorage size per domain
 * need replace row={} to row=[] or in commit, save rows without keys
 * insert/update - need test on foreign key
 * error with sorting only on pk, because rewrite in sortcolumn[result[k][orderby]] = k;
 * in select - create param deep select from child/parent
 * events:
 * 		create_table - detail:{ name: this.name }
 * 		before_insert - detail:{ row: row, name: this.name }
 * 		after_insert - detail:{ row: row, name: this.name }
 * 		before_select - detail:{ name: this.name,arg:arguments }
 * 		after_select - detail:{ name: this.name,arg:arguments,result:rst }
 * 		before_update - detail:{ name: this.name,row:row,params:{where,auto_commit}}
 * 		after_update - detail:{ name: this.name,row:row,params:{where,auto_commit},updated:updated }
 * 		before_delete - detail:{ params: params, name: this.name }
 * 		after_delete - detail:{ deleted:deleted,params: params, name: this.name }
 *
 */
class table {
	/**
	 * recursive serialization
	 */
	static objToString(obj){
		return JSON.stringify(obj);
		/*
		let tp = typeof obj;
		if(tp=="undefined"){
			return;
			}
		if(obj===String){
			return "String";
			}
		else if(obj==Boolean){
			return "Boolean";
			}
		else if(obj==Number){
			return "Number";
			}
		// else if(obj==BigInt){
		//     return "BigInt";
		//     }
		else if(obj===null){
			return "null";
			}
		else if(["boolean","number","string"].indexOf(tp)>=0){
			return JSON.stringify(obj);
			}
		else if(["bigint","function"].indexOf(tp)>=0){
			return obj.toString()+(tp=="bigint"?"n":"");
			}
		else if(tp=='object'){
			if(Array.isArray(obj)===true){
				let arrstr = obj.map(element => table.objToString(element));
				return "["+arrstr.join(',')+"]";
				}
			else{
				let objstr = Object.keys(obj).map(key => key+":"+table.objToString(obj[key]));
				return "{"+objstr.join(',')+"}";
				}
			}
		throw "symbol or ... not support";
		*/
		}
	/**
	 * deserialization
	 */
	static stringToObj(str){
		return eval("("+str+")");
		try {
			return JSON.parse(str);
		} catch (error) {
			return false
			}
		}
	/**
	 * return value from row by column name
	 */
	static get_val_by_col_name(row,col_name){
		if(Array.isArray(row)===true || (row instanceof Object)===false){
			return false;
			}
		if(col_name in row){
			return row[col_name];
			}
		col_name = col_name.toLowerCase().trim();
		for(let cl in row){
			if(cl.toLowerCase().trim() == col_name){
				return row[cl];
				}
			}
		return false;
		}
	/**
	 * used inside class table, and execute `Where`
	 * @param where : rictionary
	 * 		{
	 * 		'op':'or' || 'and' (default),
	 * 		'column name 1': function(tested_value){}, // return true || false
	 * 		'column name 2': {
	 * 			0:function(){},
	 * 			1:function(){},
	 * 			'op':'or' || 'and' (default),
	 * 			},
	 * 		'column name 3': [ //default `and`
	 * 			function(){},
	 * 			function(){},
	 * 			], 
	 * 		}
	 * @param row : tested row
	 * @param name : no need to use, service param for recursion, but if you use it then the name of the columns from the dictionary `where` will be replaced with this param
	 */
	static testWhere(where,row,name=false){
		let add = true;
		if( typeof where === 'object' ){
			for(let cl in where){
				if(cl.toLowerCase().trim() === 'op'){
					add = where[cl].toLowerCase().trim()==='and';
					break;
					}
				}
			// `and` - set add = true and stop when function change state in false
			// `or` - set add = false and stop when function change state in true
			// need to stop when the value changes
			for(let cl in where){
				cl = cl.toLowerCase().trim();
				if(cl == 'op'){
					continue;
					}
				let col_name = name!==false?name:cl;
				let vl = table.get_val_by_col_name(row,col_name);
				let isarr = typeof where[cl] == 'object';
				if(vl!==false && (where[cl] instanceof Function||isarr===true)){
					let prev_add = add;
					add = (isarr===true)?table.testWhere(where[cl],row,col_name):where[cl](vl);
					if( prev_add !== add ){
						break;
						}
					}
				else{
					return false;
					}
				}
			}
		return add;
		}

	/**
	 * init table, the table must have at least one primary key 
	 * 		inits another params
	 * 			columns_len
	 * 			lastIUDEvent
	 *
	 * @param name : name of table
	 * @columns : array of dictionary with structure || just name of column
	 * 		name : required
	 * 		pk : default = false
	 * 		required : default = false
	 * 		func -> run before insert, value = func(value), can reset or validate value
	 * 		<<you can add other parameters for future use>>
	 */
	constructor(name,columns){

		this.name = name;
		this.columns = {};
		this.rows = [];
		this.columns_len = 0;
		this.pk_columns = [];
		this.pk_index = {};
		this.fk = {}; // links on parent tables - structure in func addFK
		this.parent_fk = {}; // links on child tables - structure in func addFK
		this.lastIUDEvent = Date.now();
		if(Array.isArray(columns)===true){
			for(let i in columns){
				let row = {
					'pk' : false,
					'required' : false,
					'func' : false,
					};
				if( typeof columns[i] == 'string'){
					row.name = columns[i].toLowerCase().trim();
					}
				else{
					if(typeof columns[i].name == 'undefined'){
						throw "name of column not set";
						}
					row.name = columns[i].name.toLowerCase().trim();
					if(typeof columns[i].pk != 'undefined' && columns[i].pk===true && this.pk_columns.indexOf(row.name)<0){
						this.pk_columns.push(row['name']);
						}
					for(let j in columns[i]){
						j = j.trim();
						if(j!='name'){
							row[j] = columns[i][j];
							}
						}
					}

				this.columns[row.name] = row;
				this.columns[row.name].have_fk = false;
				this.columns_len+=1;
				}
			if(this.pk_columns.length===0){
				throw "not set pk";
				}
			if(this.pk_columns.length===1){
				this.pk_index = [];
				}
			this.restore();
			document.dispatchEvent(new CustomEvent("create_table",{ detail:{ name: this.name }}));
			}
		else{
			throw "columns is not array";
			}
		}
	/**
	 * add new foreign key, add fk in currrent ( child table) && add in parent table links on tables
	 * @param parent_tb - parent table
	 * @param parent_column - parent column name, need be primary key
	 * @param child_column - child column name
	 * @param name - name of foreign key, be used in select for show select from fk
	 * @param params - other parameters that you want to store
	 *
	 */
	addFK(parent_tb,parent_column,child_column,name,params=false){
		parent_column = parent_column.toLowerCase().trim();
		child_column = child_column.toLowerCase().trim();

		// validation
		if(parent_tb instanceof table === false){ throw "parent_tb can be only table class"; }
		if(child_column in this.columns === false){ throw "child_column not exists"; }
		if(parent_column in parent_tb.columns === false){ throw "parent_column not exists"; }
		if(parent_tb.columns[parent_column]['pk'] === false){ throw "parent_column is not pk";  }

		//init arrays
		if(child_column in this.fk === false){ this.fk[child_column] = []; }
		if(parent_column in parent_tb.parent_fk === false){ parent_tb.parent_fk[parent_column] = []; }

		//save
		this.columns[child_column].have_fk = true;
		this.fk[child_column].push({'parent':parent_column,'parent_tb':parent_tb,'name':name,'params':params});
		parent_tb.parent_fk[parent_column].push({'child':child_column,'child_tb':this,'name':name,params:params});
		}
	/**
	 * controls the tree of index
	 */
	pk_index_add(el,i,row){
		let v = table.get_val_by_col_name(row,this.pk_columns[i]);
		if(i+1==this.pk_columns.length){
			if(el.indexOf(v)<0){
				el.push(v);
				}
			return el;
			}
		if(v in el === false ){
			el[v] = i+1==this.pk_columns.length-1?[]:{};
			}
		el[v] = this.pk_index_add(el[v],i+1,row);
		return el;
		}
	/**
	 * check for a new key in the index
	 */
	test_in_index(el,i,row){
		let v = table.get_val_by_col_name(row,this.pk_columns[i]);
		if(i+1==this.pk_columns.length){
			return el.indexOf(v)>=0;
			}
		return (v in el === true)?this.test_in_index(el[v],i+1,row):false;
		}
	/** 
	 * get new value for autoincrement pk
	 */
	get_new_pk(col){
		if(col in this.columns === false){
			throw 'col not exists';
			}
		let max = 0;
		let indexmax = 0
		let tp = "";
		for(let k in this.rows){
			let v = table.get_val_by_col_name(this.rows[k],col);
			tp = typeof v;
			if(tp!='number' && tp!='string'){
				throw "auto can be used only with number or string";
				}
			v = tp=='number'?parseInt(v):v.length;
			if(v>max){
				max = v;
				indexmax = k;
				}
			}
		if(tp=='string'){
			max = this.rows[indexmax]+this.rows[indexmax][this.rows[indexmax].length-1]; // add last symbol
			}
		else{
			max+=1;
			}
		return max;
		}
	/**
	 * create index tree from rows
	 */
	resetIndex(){
		this.pk_index = this.pk_columns.length===1?[]:{};
		for(let k in this.rows){
			this.pk_index = this.pk_index_add(this.pk_index,0,this.rows[k]);
			}
		}
	/**
	 * insert new row, if primary key not set or `auto` then pk will be set autoincrement
	 * @param row - new row
	 * @ auto_commit - true || false
	 */
	insert(row,auto_commit=true){
		document.dispatchEvent(new CustomEvent("before_insert",{ detail:{ row: row, name: this.name }}));
		// autoset pk && validation && run func
		for(let col in this.columns){
			col = col.toLowerCase().trim();
			let v = table.get_val_by_col_name(row,col);
			if(this.pk_columns.indexOf(col)>=0 && (v === false || v === 'auto')){
				row[col] = this.get_new_pk(col);
				}
			if( this.columns[col]['required']===true && v === false){
				throw col+" is not set ";
				}
			if('func' in this.columns[col] && typeof this.columns[col]['func']=='function'){
				row[col] = this.columns[col]['func'](col in row?row[col]:0);
				}
			}
		//check pk in index && add new row
		if( this.test_in_index(this.pk_index,0,row) === false ){
			this.rows.push(row);
			this.pk_index = this.pk_index_add(this.pk_index,0,row);
			}
		else{
			throw "pk exists";
			}
		//commit
		if(auto_commit===true){
			this.commit();
			}
		//update datetime of last events u/d/i
		this.lastIUDEvent = Date.now();
		document.dispatchEvent(new CustomEvent("after_insert",{ detail:{ row: row, name: this.name }}));
		}



	/**
	 * select rows from table, all columns
	 *
	 * @param offset - like in sql
	 * @param row_count - like in sql, >=0 || 0 = all rows
	 * @param where - see testWhere || false
	 * @param orderby - column name
	 * @param ordertype - 'ASC'(default) or 'DESC', working only with orderby
	 * @param autosel_ptb - select from parent tables using foreign key
	 * @param autosel_ctb - select from child tables using foreign key
	 * @return dictionary( 
	 * 		'num_rows':number, // all count after where, before limit,
	 * 		'rows': rows, // array
	 * 		)
	 */
	select(offset,row_count,where,orderby,ordertype,autosel_ptb=true,autosel_ctb=false){
		let params = { offset :offset, row_count :row_count, where :where, orderby :orderby, ordertype :ordertype,
		autosel_ptb :autosel_ptb, autosel_ctb :autosel_ctb,};
		document.dispatchEvent(new CustomEvent("before_select",{ detail:{ name: this.name,arg:params }}));
		offset = params.offset;
		row_count = params.row_count;
		where = params.where;
		orderby = params.orderby;
		ordertype = params.ordertype;
		autosel_ptb = params.autosel_ptb;
		autosel_ctb = params.autosel_ctb;

		let result = [];
		for(let k in this.rows){
			if(where===false || table.testWhere(where,this.rows[k])===true){
				let tmp_row = {};
				Object.assign(tmp_row,this.rows[k]);
				result.push(tmp_row);
				}
			}
		// if nothing is selected - return empty
		if(result.length==0){
			return {'num_rows':0,'rows':result};
			}

		// order
		if(orderby in this.columns){
			let sortcolumn = {};
			let sortbynum = false;
			// create dict with keys from column by sorting
			for(let k in result){
				let nwk = table.get_val_by_col_name(result[k],orderby);
				if(nwk===false){
					nwk="";
					}
				sortbynum = sortbynum || typeof nwk == 'number';
				while(typeof sortcolumn[nwk]!="undefined"){
					nwk = typeof nwk == 'number'?nwk+1:nwk+"_";
					}
				sortcolumn[nwk] = k;
				}
			// sort dict width keys
			let k = Object.keys(sortcolumn);
			ordertype = ordertype.toLowerCase()
			if(sortbynum===true){
				k = k.map(v=>parseFloat(v)).sort(ordertype=='desc'?(a, b) => b - a : (a, b) => a - b);
				}
			else{
				k = k.sort();
				if(ordertype=='desc'){ k = k.reverse(); }
				}
			let sresult = [];
			// create new sorted result
			for(let v in k){
				sresult.push(result[sortcolumn[k[v]]]);
				}
			result = sresult;
			}
		let num_rows = result.length; // save length for return
		// Limit
		offset = parseInt(offset);
		if(isNaN(offset)===true){
			offset = 0;
			}
		row_count = parseInt(row_count);
		if(isNaN(row_count)===true){
			row_count = 0;
			}
		if(row_count>0 || offset>0){
			result = result.slice(offset,row_count>0?offset+row_count:undefined);
			}

		// select all info from child fk
		if(autosel_ctb===true){
			for(let pcol in this.parent_fk){
				for(let i in this.parent_fk[pcol]){
					let child_col_name = this.parent_fk[pcol][i]['child'];
					let name = this.parent_fk[pcol][i].name;
					for(let j in result){
						let pv = result[j][pcol];
						let arr = {};
						arr[child_col_name] = function(val){ return val===pv; };
						let crslt = this.parent_fk[pcol][i]['child_tb'].select(0,0,arr,child_col_name,'ASC',false,false);
						if(crslt.rows.length>0){
							result[j][name] = crslt;
							}
						}
					}
				}
			}

		// select all info from parent fk
		if(autosel_ptb===true){
			for(let ccol in this.fk){
				for(let i in this.fk[ccol]){
					let parent_col_name = this.fk[ccol][i]['parent'];
					let name = this.fk[ccol][i].name;
					for(let j in result){
						let pv = result[j][ccol];
						let arr = {};
						arr[parent_col_name] = function(val){ return val==pv; };
						let crslt=this.fk[ccol][i]['parent_tb'].select(0,0,arr,parent_col_name,'ASC',false,false);
						if(crslt.rows.length!==false){
							result[j][name] = crslt;
							}
						}
					}
				}
			}
		let rst = {'num_rows':num_rows,'rows':result};
		document.dispatchEvent(new CustomEvent("before_select",{ detail:{ name: this.name,arg:params,result:rst }}));
		return rst;
		}

	/**
	* Update rows in table, primary key cant update
	* @param where - see testWhere || false
	* @row - dictionary with new values for columns
	* @auto_commit - true || false
	* @return count updated rows
	*/
	update(where,row,auto_commit=true){
		let params = { where :where, auto_commit :auto_commit }
		document.dispatchEvent(new CustomEvent("before_update",{ detail:{ name: this.name,row:row,params:params }}));
		where = params.where;
		auto_commit = params.auto_commit;
		let updated = 0;
		let urow = {};
		for( let k in this.rows ){
			if(where===false || table.testWhere(where,this.rows[k])===true){
				for(let cl in row){
					if(cl in this.rows[k]===true && this.columns[cl]['pk']===false){
						this.rows[k][cl] = row[cl];
						}
					}
				updated+=1;
				}
			}
		this.resetIndex();
		if(auto_commit===true){
			this.commit();
			}

		this.lastIUDEvent = Date.now();
		document.dispatchEvent(new CustomEvent("after_update",{ detail:{ name: this.name,row:row,params:params,updated:updated }}));
		return updated;
		}

	/**
	* delete rows from table
	* @param where - see testWhere || false
	* @auto_commit - true || false
	* @return count deleted rows
	*/
	delete(where=false,auto_commit=true){
		let params = { where :where, auto_commit :auto_commit }
		document.dispatchEvent(new CustomEvent("before_delete",{ detail:{ params: params, name: this.name }}));
		where = params.where;
		auto_commit = params.auto_commit;
		//delete
		let deleted_rows = {};
		let new_rows = [];
		let deleted=0;
		for( let k in this.rows ){
			if(where===false || table.testWhere(where,this.rows[k])===true){
				deleted_rows[deleted++]=this.rows[k];
				}
			else{
				new_rows.push(this.rows[k]);
				}
			}
		this.rows = new_rows;
		//cascade delete in all child tables
		for(let pcol in this.parent_fk){
			for(let i in this.parent_fk[pcol]){
				let child_col_name = this.parent_fk[pcol][i]['child'];
				for(let j in deleted_rows){
					let pv = deleted_rows[j][pcol];
					let arr = {};
					arr[child_col_name] = function(val){ return val==pv; };
					this.parent_fk[pcol][i]['child_tb'].delete(arr);
					}
				}
			}
		this.resetIndex();
		if(auto_commit===true){
			this.commit();
			}
		this.lastIUDEvent = Date.now();
		document.dispatchEvent(new CustomEvent("after_delete",{ detail:{ deleted:deleted,params: params, name: this.name }}));
		return deleted;
		}
	/**
	 * save rows in localStorage
	 */
	commit(){
		let tmp_rows = [];
		let cols = Object.keys(this.columns);
		for(let i in this.rows){
			let row = [];
			for(let j in cols){
				row.push(table.get_val_by_col_name(this.rows[i],cols[j]));
				}
			tmp_rows.push(row);
			}
		let obj = {'columns':cols,'rows':tmp_rows};
		localStorage.setItem(this.name,table.objToString(obj));
		}
	/**
	 * restore rows from localStorage
	 */
	restore(){
		let rws = localStorage.getItem(this.name);
		if(rws!==null){
			rws = table.stringToObj(rws);
			if( Array.isArray(rws.columns)===true && rws.columns.length>0 && Array.isArray(rws.rows)===true){
				for(let i in rws.rows){
					let row = {};
					for(let j in rws.columns){
						row[rws.columns[j]] = rws.rows[i][j];
						}
					this.insert(row);
					}
				}
			this.lastIUDEvent = Date.now();
			}
		}
	};








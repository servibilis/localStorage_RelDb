# localStorage_RelDb
This is the implementation of storing structured data in localStorage and managing it.
It provides insert / update / delete / select capabilities.
At the basic level, primary and foreign keys are implemented.
It has no dependencies and is not based on WebSQL.
Data is stored as serialized JSON in localStorage.

# Usage / Examples
Here's the [demo](https://servibilis.github.io/button-up-down/index.html).
```javascript

let f_datetime = val => Date.now();

var users = new table('users',[
	{name:'id',pk:true},
	{name:'name',required:true},
	'password',
	]);

var films = new table('films',[
	{name:'id',pk:true},
	'name',
	'year',
	'user_id',
	'size',
	'device_id',
	]);

films.addFK(users,'id','user_id','fkusers','name');

var stats_traffic = new table('statistics',[
	{name:'id',pk:true},
	{name:'user_id',required:true},
	{name:'film_id',required:true},
	{name:'dt',required:false,func:f_datetime},
	'size',
	]);

stats_traffic.addFK(users,'id','user_id','fkusers','name');
stats_traffic.addFK(films,'id','film_id','fkfilm','name');

//events:
//		create_table - detail:{ name: this.name }
//		before_insert - detail:{ row: row, name: this.name }
//		after_insert - detail:{ row: row, name: this.name }
//		before_select - detail:{ name: this.name,arg:arguments }
//		after_select - detail:{ name: this.name,arg:arguments,result:rst }
//		before_update - detail:{ name: this.name,row:row,params:{where,auto_commit}}
//		after_update - detail:{ name: this.name,row:row,params:{where,auto_commit},updated:updated }
//		before_delete - detail:{ params: params, name: this.name }
//		after_delete - detail:{ deleted:deleted,params: params, name: this.name }
document.addEventListener('after_insert', function (e){
	console.log(e.detail);
	});

users.insert({ name:'Tyrion Lannister', password:"helloworld" });
users.insert({ id:'auto',name:'The Night King', password:"helloworld" });
users.insert({ id:999,' NaME':'Gregor Clegane', password:"helloworld" });

films.insert({name:"Dragonstone", year:2017, user_id:7,size:1.2,device_id:1});
films.insert({name:"Game of Thrones - Winterfell", year:2019, user_id:1,size:1.2,device_id:1});
films.insert({name:"Game of Thrones - A Knight of the Seven Kingdoms", year:2019, user_id:2,size:1.3,device_id:2});
films.insert({name:"Game of Thrones - The Long Night", year:2019, user_id:3,size:1.1,device_id:3});
films.insert({name:"Game of Thrones - The Last of the Starks", year:2019, user_id:4,size:1.23,device_id:1});
films.insert({name:"Game of Thrones - The Bells", year:2019, user_id:5,size:1.45,device_id:3});
films.insert({name:"Game of Thrones - The Iron Throne", year:2019, user_id:6,size:1.6,device_id:2});

stats_traffic.delete();


let where_usrs = {
	'id':v => v==1,
	};
let where_traffic = {
	'user_id':
		0:v => v==1,
		1:v => v<2,
		'op':'and',
		},
	};

let _u = users.select(0,0,where_usrs);
let _t = stats_traffic.select(0,0,where_traffic);

let c = stats_traffic.update(where_traffic,{'film_id':1});

c = users.delete(where_usrs);
```


## Methods
```javascript
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
constructor(name,columns)

/**
* add new foreign key, add fk in currrent ( child table) && add in parent table links on tables
* @param parent_tb - parent table
* @param parent_column - parent column name, need be primary key
* @param child_column - child column name
* @param name - name of foreign key, be used in select for show select from fk
* @param params - other parameters that you want to store
*/
addFK(parent_tb,parent_column,child_column,name,params=false)

/**
* create index tree from rows
*/
resetIndex()

/**
* insert new row, if primary key not set or `auto` then pk will be set autoincrement
* @param row - new row
* @ auto_commit - true || false
*/
insert(row,auto_commit=true)

/**
* select rows from table, all columns
*
* @param offset - like in sql
* @param row_count - like in sql, >=0 || 0 = all rows
* @param where : dictionary
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
* @param orderby - column name
* @param ordertype - 'ASC'(default) or 'DESC', working only with orderby
* @param autosel_ptb - select from parent tables using foreign key
* @param autosel_ctb - select from child tables using foreign key
* @return dictionary( 
* 		'num_rows':number, // all count after where, before limit,
* 		'rows': rows, // array
* 		)
*/
select(offset,row_count,where,orderby,ordertype,autosel_ptb=true,autosel_ctb=false);

/**
* Update rows in table, primary key cant update
* @param where - see testWhere || false
* @row - dictionary with new values for columns
* @auto_commit - true || false
* @return count updated rows
*/
update(where,row,auto_commit=true)

/**
* delete rows from table
* @param where - see testWhere || false
* @auto_commit - true || false
* @return count deleted rows
*/
delete(where=false,auto_commit=true)

/**
* save rows in localStorage
*/
commit()

/**
* restore rows from localStorage
*/
restore()
```








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

document.addEventListener('after_insert', function (e){
	// console.log(e.detail);
	});


if(users.rows.length==0){
	users.insert({ name:'Tyrion Lannister', password:"helloworld" });
	users.insert({ name:'Daenerys Targaryen', password:"helloworld" });
	users.insert({ name:'Arya Stark', password:"helloworld" });
	users.insert({ name:'Brienne of Tarth', password:"helloworld" });
	users.insert({ name:'Sandor Clegane', password:"helloworld" });
	users.insert({ id:'auto',name:'The Night King', password:"helloworld" });
	users.insert({ id:999,' NaME':'Gregor Clegane', password:"helloworld" });
	}

if(films.rows.length==0){
	films.insert({name:"Dragonstone", year:2017, user_id:7,size:1.2,device_id:1});
	films.insert({name:"Stormborn", year:2017, user_id:1,size:1.1,device_id:2});
	films.insert({name:"The Queen's Justice", year:2017, user_id:2,size:1.5,device_id:3});
	films.insert({name:"The Spoils of War", year:2017, user_id:3,size:1.4,device_id:1});
	films.insert({name:"Eastwatch", year:2017, user_id:4,size:1.3,device_id:2});
	films.insert({name:"Beyond the Wall", year:2017, user_id:5,size:1.5,device_id:3});
	films.insert({name:"The Dragon and the Wolf", year:2017, user_id:6,size:1.1,device_id:1});
	films.insert({name:"Game of Thrones - Winterfell", year:2019, user_id:1,size:1.2,device_id:1});
	films.insert({name:"Game of Thrones - A Knight of the Seven Kingdoms", year:2019, user_id:2,size:1.3,device_id:2});
	films.insert({name:"Game of Thrones - The Long Night", year:2019, user_id:3,size:1.1,device_id:3});
	films.insert({name:"Game of Thrones - The Last of the Starks", year:2019, user_id:4,size:1.23,device_id:1});
	films.insert({name:"Game of Thrones - The Bells", year:2019, user_id:5,size:1.45,device_id:3});
	films.insert({name:"Game of Thrones - The Iron Throne", year:2019, user_id:6,size:1.6,device_id:2});
	}


function log(message,obj){
	console.log("%c"+message,"color:gray;");
	console.log(obj);
	}

log("table users",users);
log("table films",films);
log("table stats_traffic",stats_traffic);

stats_traffic.delete();
let now = Date.now();
stats_traffic.columns['dt']['func'] = v=>v;
for(let i=0;i<600;i++){
	let minus_days = Math.random() * 30 * 24 * 60 * 60 * 1000;
	let dt = parseInt(now-minus_days);
	let sz = Math.random()*50;
	let uid = users.rows[parseInt(Math.random()*users.rows.length)]['id'];
	let d = {id:'auto',user_id:uid,film_id:parseInt(Math.random()*13)+1,dt:dt,size:sz};
	stats_traffic.insert(d);
	}

let where_usrs = {
	'id':v => v==1,
	};
let where_traffic = {
	'user_id':{
		0:v => v==1,
		1:v => v<2,
		'op':'and',
		},
	};
let _u = users.select(0,0,where_usrs);
let _t = stats_traffic.select(0,0,where_traffic);

log("select from users where id=1",_u);
log("select from stats_traffic where user_id=1 and user_id<2",_t);

let c = stats_traffic.update(where_traffic,{'film_id':1});
log("Update stats_traffic Set film_id=1 where user_id=1 or user_id=2");

_t = stats_traffic.select(0,0,where_traffic);
log("select from stats_traffic after update",_t);

c = users.delete(where_usrs);
log("delete from users where id=1 or id=2 and cascade delete from stats_traffic using foreign key, number of deleted records",c);
log("table users",users);
log("table stats_traffic",stats_traffic);

_t = stats_traffic.select(0,0,where_traffic);
log("select from stats_traffic where user_id=1 or user_id=2",_t);

log( "After each insert / update / delete, autosave in localstorage works. After the restart, you will receive empty requests everywhere, if you clear localstorage, the requests will work again.",'' );


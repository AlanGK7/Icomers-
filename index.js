import { neon } from '@neondatabase/serverless';
import express, { query } from 'express';
import {engine} from 'express-handlebars';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';


const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
const sql = neon('postgresql://neondb_owner:92yVdXKfFpRI@ep-dry-paper-a5cea43g.us-east-2.aws.neon.tech/neondb?sslmode=require');
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
const keyword = 'holabuenastardes';
const cookieNameAuth = "adjkawj1";
const passwordAdmin = 'admin';

/*const authMiddeleware = async(req,res,next)=>{
  const token = req.cookies[cookieNameAuth];


  try{
    req.usuario = jwt.verify(token,keyword);
    const results = await sql('SELECT * FROM usuario WHERE id = $1', [req.usuario.id]);
    req.usuario = results[0];
    next();

  }catch(e){
    res.render('no_autorizados');

  }
};
*/
const isAdminMiddleware = async (req, res, next) => {
  if (!req.usuario.rol) {
    res.send('No eres admin');
    return;
  }
  next();
};



app.get('/', async(req,res) => {
  const lista = await sql('SELECT * FROM producto');
  res.render('productos', {lista});

});

app.get('/login', async (req,res)=>{
  const error = req.query.error;
  res.render('login', {error});
});
app.get('/logout', (req, res) => {
  res.cookie(cookieNameAuth, '', { maxAge: 1 });
  res.send('deslogeado');
});

app.post('/login', async (req, res) => {
  const mail = req.body.mail;
  const password = req.body.password;

  const query = 'SELECT id, password FROM usuario WHERE mail = $1';
  const results = await sql(query, [mail]);

  if (results.length === 0) {
    res.redirect(302, '/login?error=unauthorized'); // Corregido el typo de "uanuthorized"
    return;
  }

  const id = results[0].id;
  const hash = results[0].password;

  if (bcrypt.compareSync(password, hash)) {
    const fiveMinutesFromNowInSeconds = Math.floor(Date.now() / 1000) + 5 * 60;
    const token = jwt.sign({ id, exp: fiveMinutesFromNowInSeconds }, keyword);

    res.cookie(cookieNameAuth, token, { maxAge: 60 * 5 * 1000, httpOnly: true });
    res.redirect(302, 'perfil');
    return;
  }
  res.redirect('/login?error=unauthorized'); 
});

app.get('/registro', (req,res)=>{
  res.render('registro');
});

/*app.post('/registroUser', async(req,res)=>{
  const nombre = req.body.nombre;
  const mail = req.body.mail;
  const password = req.body.password;

  const hash = bcrypt.hashSync(password,5);
  const query = 'INSERT INTO usuario(nombre,mail,password) values ($1,$2,$3) RETURNING id';
  
  try{
    const results = await sql(query,[nombre,mail,hash]);
    const id = results[0].id;

    const tiempo = Math.floor(Date.now()/1000) + 30*60; 
    const token = jwt.sign(
      {id , exp: tiempo}, 
      keyword
    );
    res.cookie(cookieNameAuth,token, {maxAge: 30*60 * 1000 } );
    res.redirect(302,"perfil");

  } catch(error){
    res.render('yaRegitrado');
  }


});
*/

app.post('/signup', async (req, res) => {
  const nombre = req.body.nombre;
  const mail = req.body.mail;
  const password = req.body.password;

  const hash = bcrypt.hashSync(password, 5);
  const query =
    'INSERT INTO usuario(nombre, mail, password) VALUES ($1, $2, $3) RETURNING id';

  try {
    const results = await sql(query, [nombre, mail, hash]);
    const id = results[0].id;

    const fiveMinutesFromNowInSeconds = Math.floor(Date.now() / 1000) + 45 * 60;
    const token = jwt.sign(
      { id, exp: fiveMinutesFromNowInSeconds },
      keyword
    );

    res.cookie(cookieNameAuth, token, { maxAge: 60 * 45 * 1000 });
    res.redirect(302, '/perfil');
  } catch {
    res.render('yaRegistrado');
  }
});
const authMiddleware = async (req, res, next) => {
  const token = req.cookies[cookieNameAuth];
  if (!token) {
    return res.render('unauthorized');
  }

  try {
    req.usuario = jwt.verify(token, keyword);
    next();
  } catch (e) {
    res.render('no_autorizados');
  }
};

app.get('/perfil', authMiddleware, async(req,res)=>{
  const id_usuario = req.usuario.id;
  const query = 'select nombre,mail from usuario where id = $1';
  const results = await sql(query,[id_usuario]); 
  const user = results[0];
  res.render('perfil',user);

});


app.get('/contactos', (req,res) =>{
  res.render('contactos');
});
app.post('/enviar/contacto', async(req,res) =>{
  const nombre = req.body.nombre;
  const mail = req.body.mail;
  const mensaje = req.body.mensaje;

   const query = 'insert into contacto(nombre,mail,mensaje) values($1 , $2, $3)';
   await sql(query,[nombre,mail,mensaje]);
   res.redirect('/');

});
app.get('/agregar/producto', (req,res) => {
  res.render('agregar_producto');
})
app.post('/agregar', async(req,res)=> { // se agrega action en agregar productos
  const nombre = req.body.nombre;
  const precio = req.body.precio;
  const imagen = req.body.imagen;
  
  const query = 'insert into producto(nombre,precio,imagen) values ($1, $2, $3)';
  await sql(query,[nombre,precio,imagen]);
  res.redirect('/');
});


app.post('/agregar/carrito',authMiddleware , async(req,res)=>{ // middeleware funcional
  const id_user = req.usuario.id;
  const id_producto = req.body.id_producto; // acceder a la id del producto

  await sql('insert into carrito(id_usuario,id_producto) values ($1,$2)',[id_user,id_producto]);
  res.redirect('/');

});
app.get('/carrito', authMiddleware, async(req,res)=>{
  const id_usuario=req.usuario.id;
  const numero_productos = await sql('SELECT COUNT(*) AS total_productos FROM carrito WHERE id_usuario = $1');
  const producto = await sql('select producto.id_producto, producto.nombre, producto.precio from carrito join producto on carrito.id_producto = producto.id_producto');
    
});
app.listen(3000);






/*
	app
		->	Servicio Generado por server.js (Necesario para Agregar los metodos segun URL)
	model
		->	model.
		{
			name:				String;				Nombre del model
		,	key:				String; 			Clave Principal del model [id]
		,	assocs:				Array of Object;	Assocs
			[
				{
					name:			String;			Nombre del Assoc
				,	type:			String;			Tipo de Assoc [has-one | has-many | belongs-to | has-and-belongs-to-many]
				}
			]
		}
*/
module.exports
=	function(app)
	{
		
		var	_
		=	require('underscore')
		,	Builder
		=	app.get('builder')
		,	URL
		=	require('url')

		var	getCollection
		=	function(url_or_query_collection,model_collection)
			{
				return	_.extend(
							model_collection
						,	_.pick(
								url_or_query_collection
							,	['type','ipp','page']
							)
						)
			}

		_.each(
			app.get('Model')
		,	function(model)
			{
				app.get(
					app.get('base')
				+	model.model_template.expand(
						{
							model_name:		model.name
						}
					)
				,	function(req,res)
					{
						Store
							.list(
								model.name
							,	getCollection(URL.parse(req.url,true).query,model.collection)
							).then(
								function(data)
								{
									res.send(
										app.build.response(model,[],data,getCollection(URL.parse(req.url,true).query,model.collection))
									)
								}
							)
					}
				)

				app.get(
					app.get('base')
				+	model.model_id_template.expand(
						{
							model_name:		model.name
						,	model_key:		model.key
						}
					)
				,	function(req,res)
					{
						Store
							.show(
								model.name
							,	req.params[model.key]
							).then(
								function(data)
								{
									res.send(
										app.build.response(model,[],data)
									)
								}
							)
					}
				)

				app.post(
					app.get('base')
				+	model.model_template.expand(
						{
							model_name:		model.name
						}
					)
				,	function(req,res)
					{
						if	(_.isFunction(Store[req.body.action]))
							Store[req.body.action](
								model.name
							,	_.extend(
									req.body
								,	{
										collection_query:	getCollection(
																req.body.collection_query
															||	{}
															,	model.collection
															)
									}
								)
							).then(
								function(data)
								{
									app.send(req,res,data)
								}
							)
						else
							app.send(req,res,400)
					}
				)

				app.put(
					app.get('base')
				+	model.model_id_template.expand(
						{
							model_name:		model.name
						,	model_key:		model.key
						}
					)
				,	function(req,res)
					{
						Store
							.update(
								model.name
							,	req.params[model.key]
							,	req.body
							).then(
								function(data)
								{
									app.send(req,res,data)
								}
							)
					}
				)

				app.delete(
					app.get('base')
				+	model.model_id_template.expand(
						{
							model_name:		model.name
						,	model_key:		model.key
						}
					)
				,	function(req,res)
					{
						Store
							.delete(
								model_name
							,	req.params[model.key]
							).then(
								function(data)
								{
									app.send(req,res,data)
								}
							)
					}
				)

				_.each(
					model.assocs
				,	function(assoc)
					{
						app.get(
							app.get('base')
						+	assoc.template.expand(
								{
									model_name:		model.name
								,	model_key:		model.key
								,	model_assoc:	assoc.name
								}
							)
						,	function(req,res)
							{
								Store
									[assoc.getAction()](
										assoc.target
									,	assoc.getBody(req.params)
									).then(
										function(data)
										{
											app.send(req,res,data)
										}
									)
							}
						)
					}
				)
			}
		)


	}
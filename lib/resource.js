var	Q
=	require('q')
,	_
=	require('underscore')
	_.str
=	require('underscore.string')

module.exports
=	function(app)
	{
		var	Store
		=	app.get('Store')
		,	Association
		=	require('../lib/association.js')(app)

		return	function(transform_name,transform)
				{
					this.name
					=	transform_name

					this.key
					=	'id'	//	TODO:	Obtener Clave Primaria desde el Mapping

					this.model_template
					=	uritemplate(
							'/{model_name}'
						)

					this.model_id_template
					=	uritemplate(
							'/{model_name}/:{model_key}'
						)

					this.model_assoc_template
					=	uritemplate(
							'/{model_name}/:{model_key}/:{model_assoc}'
						)

					this.root
					=	transform.root

					this.associations
					=	_.map(
							transform.associations
						,	function(assoc,assoc_name)
							{
								return	new	Association(
												assoc_name
											,	{
													name:	transform_name
												,	key:	'id'
												}
											,	assoc
										)
							}
						)

					this.collection
					=	transform.collection
					||	{
							type:	'list'
						,	page:	1
						,	ipp:	10
						}

					this.sortBy
					=	transform.sortBy
					||	'id'

					this.url
					=	function(data)
						{
							return	_.isUndefined(data)
									?	app.get('base_url')
									+	this.model_template
												.expand(
													{
														model_name:		this.name
													}
												)
									:	app.get('base_url')
									+	this.model_id_template
												.expand(
													{
														model_name:		this.name
													,	model_key:		data[this.key]
													}
												).replace(':','')
						}

					this.get_resource_links
					=	function(data)
						{
							var	links
							=	new Object()
							,	self
							=	this

							_.each(
								app.get('curies').resource
							,	function(curie)
								{
									var	link
									=	self.model_id_template
												.expand(
													{
														model_name:		self.name
													,	model_key:		data[self.key]
													}
												).replace(':','')
									links[curie.name+':'+self.name]
									=	link
								}
							)

							return	links
						}

					this.get_collection_links
					=	function(url)
						{
							var	links
							=	new Object()
							,	self
							=	this
							
							_.each(
								app.get('curies').collection
							,	function(curie)
								{
									links[curie.name+':'+self.name]
									=	url
								}
							)

							return	links
						}

					this.get_links
					=	function(data)
						{
							var	links
							=	new Object()

							_.each(
								this.associations
							,	function(assoc)
								{
									_.each(
										assoc.get_curies()
									,	function(curie)
										{
											var	link
											=	assoc.get_link(data)
											links[curie.name+':'+link.name]
											=	link
										}
									)
								}
							)

							if	(this.isRoot())
								_.each(
									app.get('api_links')
								,	function(api_link,link_name)
									{
										links[link_name]
										=	api_link
									}
								)

							return	links
						}

					this.get_curies
					=	function()
						{
							var	curies
							=	new Object()

							_.each(
								this.associations
							,	function(assoc)
								{
									_.each(
										assoc.get_curies()
									,	function(curie)
										{
											curies[curie.name]
											=	curie
										}
									)
								}
							)

							if	(this.isRoot())
								_.extend(
									curies
								,	app.get('curies').api
								)

							return	curies
						}

					this.get_assoc
					=	function(name)
						{
							return	_.find(
										this.associations
									,	function(fassoc)
										{
											return	_.isEqual(fassoc.name,name)
										}
									)
						}

					this.get_associations
					=	function(req,data)
						{
							var	self
							=	this

							return	_.filter(
										this.associations
									,	function(assoc)
										{
											return	!self.was_visited(req,data,assoc)
												&&	!_.isEqual(assoc.embedded,'none')
												&&	!_.isEmpty(assoc.url(data))
										}
									)
						}

					this.resolve_assoc
					=	function(req,assoc,data)
						{
							var	deferred
							=	Q.defer()

							if	(_.isString(assoc))
								assoc
								=	this.get_assoc(assoc)

							var	target_model
							=	assoc.get_model(data)
							,	action
							=	assoc.get_method(data)
							,	body
							=	assoc.get_body(data)
							
							target_model[action](body)
							.then(
								function(result)
								{
									app.build[
										_.has(result,'data','count')
										?	'collection'
										:	'resource'
									](_.extend(req,{url: assoc.url(data)}),target_model,result,assoc.collection,assoc.embedded)
									.then(
										function(hal)
										{
											deferred
												.resolve(
													_.extend(
														hal
													,	{
															name:	assoc.name
														}
													)
												)
										}
									)
								}
							)

							return	deferred.promise
						}

					this.create_assoc
					=	function(req,assoc,data)
						{
							var	deferred
							=	Q.defer()

							if	(_.isString(assoc))
								assoc
								=	this.get_assoc(assoc)

							var	target_model
							=	assoc.get_model(data)

							target_model
								.create(
									_.extend(
										req.body
									,	_.object(
											[assoc.target_key]
										,	[data[assoc.key]]
										)
									)
								).then(
									function(result)
									{
										app.build.resource(
											_.extend(req,{url: assoc.url(data)}),target_model,result,assoc.collection,assoc.embedded
										)
										.then(
											function(hal)
											{
												deferred
													.resolve(
														_.extend(
															hal
														,	{
																name:	assoc.name
															}
														)
													)
											}
										)
									}
								)

							return	deferred.promise
						}

					this.was_visited
					=	function(req,data,assoc)
						{
							var	requested
							=	{
									from:	assoc.source.name
								,	to:		assoc.target
								,	name:	assoc.name
								,	data:	data
								,	type:	assoc.type
								}
							,	found
							=	_.find(
									req.visited
								,	function(visited)
									{
										// if	(
										// 		_.isEqual(visited.from,requested.from)
										// 	&&	_.isEqual(visited.to,requested.to)
										// 	&&	_.isEqual(visited.name,requested.name)
										// 	&&	_.isEqual(visited.type,requested.type)
										// 	)	return 	_.isEqual(visited.data,requested.data)
										// else
											if	(
													_.isEqual(visited.from,requested.to)
												&&	_.isEqual(visited.to,requested.from)
												)	if	(
														(_.isEqual(requested.type,'belongs-to') && _.str.include(visited.type,'has-'))
														||	(_.str.include(requested.type,'has-') && _.isEqual(visited.type,'belongs-to'))
														)	return	_.isEqual(visited.data,requested.data)
											else
												return	false
									}
								)
							if	(_.isUndefined(found))
								req.visited.push(requested)
							return	!_.isUndefined(found)
						}

					this.isRoot
					=	function()
						{
							return	this.root
						}

					this.count
					=	function(assoc,data)
						{
							var	deferred
							=	Q.defer()

							Store
								[
									assoc 
									?	'count_through'
									:	'count'
								](
									assoc
									?	this.get_assoc(assoc).get_model(data).name
									:	this.name 
								,	assoc
								&&	this.get_assoc(assoc).get_body(data)
								).then(
									function(count)
									{
										deferred
											.resolve(
												count
											)
									}
								)

							return	deferred.promise
						}

					this.findOne
					=	function(id)
						{
							var	deferred
							=	Q.defer()

							Store
								.show(
									this.name
								,	id
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}
					
					this.findOneBy
					=	function(body)
						{
							var	deferred
							=	Q.defer()

							Store
								.find(
									this.name
								,	body
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}

					this.findOneThrough
					=	function(body)
						{
							var	deferred
							=	Q.defer()

							Store
								.find_through(
									this.name
								,	body
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}
					
					this.findAll
					=	function(collection_query)
						{
							var	deferred
							=	Q.defer()

							Store
								.list(
									this.name
								,	collection_query
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}

					this.findAllBy
					=	function(body)
						{
							var	deferred
							=	Q.defer()	

							Store
								.filter(
									this.name
								,	body
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}
					
					this.findAllThrough
					=	function(body)
						{
							var	deferred
							=	Q.defer()

							Store
								.filter_through(
									this.name
								,	body
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}

					this.update
					=	function(id,data)
						{
							var	deferred
							=	Q.defer()

							Store
								.update(
									this.name
								,	id
								,	data
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}
					
					this.create
					=	function(data)
						{
							var	deferred
							=	Q.defer()

							Store
								.create(
									this.name
								,	data
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}

					this.delete
					=	function(id)
						{
							var	deferred
							=	Q.defer()

							Store
								.delete(
									this.name
								,	id
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}
				}
	}
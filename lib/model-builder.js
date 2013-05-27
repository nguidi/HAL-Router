var	Factory
=	function(
		_
	,	HAL
	,	Q
	,	Store
	,	URL
	)
	{
		return	function(config,mappings,transforms,acl)
				{
					var	Resources
					=	new Object()

					function Association(spec_key,assoc,assoc_key)
					{
						var	self
						=	this
						,	embeded_defaults
						=	{
								type: "none"
							}

						this.source
						=	spec_key

						this.name
						=	assoc_key
						
						this.type
						=	assoc.type

						this.target
						=	assoc.target

						this.target_key
						=	assoc.target_key
						||	'id'

						this.key
						=	assoc.key
						||	'id'

						if	(_.isEqual(assoc.type,"has-and-belongs-to-many"))
						{
							this.through
							=	assoc.through

							this.key
							=	'id'

							this.target_key
							=	'id'

							this.through_key
							=	_.find(
									transforms[assoc.target].associations
								,	function(through_assoc)
									{
										return	through_assoc.target == self.source
									}
								).target_key

							this.through_target_key
							=	assoc.target_key
						}	else
							if	(_.isDefined(assoc.through))
							{
								this.through
								=	assoc.through

								this.through_key
								=	_.find(
										transforms[assoc.through].associations
									,	function(through_assoc)
										{
											return	through_assoc.target == self.source
										}
									)['key']

								this.through_target_key
								=	_.find(
										transforms[assoc.target].associations
									,	function(through_assoc)
										{
											return	through_assoc.target == assoc.through
										}
									)[
										_.str.include(this.type,'has-many')
										?	'target_key'
										:	'key'
									]
							}

						this.link
						=	assoc.link

						this.embedded
						=	_.isString(assoc.embedded)
							?	{type: assoc.embedded}
							:	_.extend(
									embeded_defaults
								,	assoc.embedded
								)


						this.generate_links
						=	function(data,profile)
							{
								console.log("Assoc.generate_link")
								return	URL.format(
												{
													protocol:	config.server.protocol
												,	hostname:	config.server.host
												,	port:		config.server.port
												,	pathname:	config.server.base+'/'+this.source+'/'+data.id+'/'+this.name
												}
											)
							}

						this.generate_query
						=	function(data)
							{
								return	{
											action:	_.str.include(this.type,'has-many') || _.isEqual(this.type,'has-and-belongs-to-many')
													?	'filter'
													:	'find'
										,	query:
											[
												_.str.include(this.type,'through') || _.isEqual(this.type,'has-and-belongs-to-many')
												?	{}
												:	{
														key:	this.target_key
													,	value:	data[
																	_.str.include(this.type,'has-')
																	?	this.key
																	:	this.target_key
																]
													}
											]
										,	through:	_.isDefined(this.through)
														?	{
																name:		this.through
															,	target_key:		this.target_key
															,	through_key:	this.through_key
															,	value:	data[this.key]
															,	through_target_key:	this.through_target_key
															}
														:	undefined
										}
							}

						this.create_request
						=	function(req,data)
							{
								return	_.extend(
											req
										,	{
												method:	'POST'
											,	url:	this.generate_links(data)
											,	body:	this.generate_query(data)
											}
										)
							}

						this.check_req
						=	function(req,data)
							{
								var	requested
								=	{
										from:	this.source
									,	to:		this.target
									,	name:	this.name
									,	data:	data
									,	type:	this.type
									}
								,	found
								=	_.find(
										req.visited
									,	function(visited)
										{
											if	(
													_.isEqual(visited.from,requested.from)
												&&	_.isEqual(visited.to,requested.to)
												&&	_.isEqual(visited.name,requested.name)
												&&	_.isEqual(visited.type,requested.type)
												)	return 	_.isEqual(visited.data,requested.data)
											else
												if	(
														_.isEqual(visited.from,requested.to)
													&&	_.isEqual(visited.to,requested.from)
													)	return	(_.isEqual(requested.type,'belongs-to') && _.str.include(visited.type,'has-'))
															||	(_.str.include(requested.type,'has-') && _.isEqual(visited.type,'belongs-to'))
												else
													return	false
										}
									)
								if	(_.isUndefined(found))
									req.visited.push(requested)
								return	_.isDefined(found)
							}

						this.generate_embedded
						=	function(req,data)
							{
								console.log("Assoc.generate_embedded")
								var	deferred
								=	Q.defer()
								,	avoid_embedded
								=	this.check_req(req,data)

								deferred
									.resolve(
										_.isUndefined(this.embedded) || _.isEqual(this.embedded.type,"none") || avoid_embedded
										?	{}
										:	_.isEqual(this.embedded.type,'partial')
											?	Resources[_.str.capitalize(this.target)]
													.resolve_partial(
														this.create_request(req,data)
													)
											:	Resources[_.str.capitalize(this.target)]
													.resolve(
														this.create_request(req,data)
													)
									)

								return	deferred.promise
							}
					}

					function Resource(name,transform,mapping)
					{
						this.name
						=	name
						
						this.associations
						=	_.map(
								transform.associations
							,	function(assoc,assoc_key)
								{
									return	new	Association(name,assoc,assoc_key)
								}
							)

						this.fields
						=	mapping.fields
						
						//	Local Store, contains a stack resources.
						this.store
						=	new Object()

						//	Resolve a request. Decides how to proceed. Also known as Partial embedded Resolve
						this.resolve
						=	function(req)
							{
								console.log("Resource.resolve(FULL)")
								var deferred
								=	Q.defer()
								,	parsed
								=	this.parse_url(req)

								if	(_.isDefined(parsed.subcollection))
									parsed
									=	this.parse_url(
												Resources[_.str.capitalize(parsed.collection)]
													.assoc_method(
														req
													,	parsed.subcollection
													,	{
															id:	parsed.id
														}
													)
											)

								var	method
								=	_.isEqual(parsed.method,'GET') || _.isUndefined(parsed.method)
									?	_.isDefined(parsed.id)
											?	'show'
											:	'list'
									:	_.isEqual(parsed.method,'PUT')
										?	'update'
										: 	_.isEqual(parsed.method,'DELETE')
											?	'delete'
											:	parsed.body.action

								deferred
									.resolve(
										_.isObject(method)
										?	this[method.body.action](req,parsed)
										:	_.isUndefined(this[method])
											?	Resources['Status_codes']
													.resolve(
														_.extend(
															req
														,	{
																status_code: 405
															}
														)
													)
											:	this[method](req,parsed)
									)

								return	deferred.promise
							}

						//	Resolve a request but without embeddeds (only links). Also known as Single embedded Resolve
						this.resolve_partial
						=	function(req)
							{
								console.log("Resource.resolve(PARTIAL)")
								var deferred
								=	Q.defer()
								,	parsed
								=	this.parse_url(req)
								,	method
								=	parsed.body.action

								deferred
									.resolve(
										_.isUndefined(this[method])
										?	Resources['Status_codes']
												.resolve(
													_.extend(
														req
													,	{
															status_code: 405
														}
													)
												)
										:	this[method](req,parsed,true)
									)

								return	deferred.promise
							}

						//	Parse a request url
						this.parse_url
						=	function(req)
							{
								var parsed_url
								=	URL.parse(req.url).pathname
								,	url
								=	URL.parse(parsed_url.match(RegExp('^'+config.server.base+'(.*)$'))[1]).pathname
								,	splited
								=	url.split('/')
								,	collection_query
								=	_.extend(
										_.object(
											['type','ipp','page']
										,	['list',0,1]
										)
									,	_.pick(
											_.isEqual(req.method,'POST')
											?	req.body.collection_query
											||	{}
											:	URL.parse(req.url,true).query
										,	['type','ipp','page']
										)
									)
								_.each(
									['ipp','page']
								,	function(val)
									{
										collection_query[val]
										=	parseInt(collection_query[val])
									}
								)
								return	{
											method:			req.method
										,	url:			req.url
										,	data_url:		url
										,	collection:		splited[1]
										,	id:				splited[2]
										,	subcollection:	splited[3]
										,	body:			_.extend(
																req.body
															,	{
																collection_query: collection_query
																}
															)
										,	query:			collection_query
										}
							}

						this.assoc_method
						=	function(req,assoc_key,data)
							{
								var	assoc
								=	_.find(
										this.associations
									,	function(assoc)
										{
											return	_.isEqual(assoc.name,assoc_key)
										}
									)

								return	assoc.create_request(req,data)
							}

						//	Get the resource url
						this.url
						=	function(data)
							{
								var resource_url
								=	_.isDefined(data)
									?	this.name+'/'+data.id
									:	this.name

								return	URL.format(
												{
													protocol:	config.server.protocol
												,	hostname:	config.server.host
												,	port:		config.server.port
												,	pathname:	config.server.base+'/'+resource_url
												}
											)
							}

						this.create_hal
						=	function(data,profile)
							{
								console.log("Resource.create_hal")
								var	hal_resource
								=	new HAL.Resource(
											data
										,	this.url(data)
										)

								_.each(
									this.associations
								,	function(assoc)
									{
										hal_resource
											.link(
												assoc.name
											,	assoc.generate_links(data,profile)
											)
									}
								)

								this.store[data.id]
								=	hal_resource

								return	hal_resource
							}

						this.unresolved_assocs
						=	function(stored)
							{
								console.log("Resource.unresolved_assocs")
								return	_.filter(
											this.associations
										,	function(assoc)
											{
												return	_.isUndefined(stored._data._embedded[assoc.name])
											}
										)
							}


						this.build_resource
						=	function(req,raw_data,partial)
							{
								console.log("Resource.build_resource")

								if	(_.isEmpty(raw_data))
									return	Resources['Status_codes']
												.resolve(
													_.extend(
														req
													,	{
															status_code: 404
														}
													)
												)
								else	{
									var	deferred
									=	Q.defer()
									,	hal_result
									=	_.isDefined(this.store[raw_data.id])
										?	this.store[raw_data.id]
										:	this.create_hal(raw_data,req.session.user.profile)

									if	(partial)
										deferred
											.resolve(
												HAL.Resource.Partial(hal_result)
											)
									else
										Q.all(
											_.map(
												this.unresolved_assocs(
														hal_result
													)
											,	function(assoc)
												{
													return	assoc.generate_embedded(req,raw_data)
												}
											)
										).then(
											function(embeddeds)
											{
												_.each(
													embeddeds
												,	function(embeded,embeded_key)
													{
														if	(!_.isEmpty(embeded))
															hal_result
																.embed(
																	embeded.name
																,	embeded
																)
													}
												)

												deferred
													.resolve(
														hal_result
													)
											}
										)
									
									return deferred.promise
								}
							}

						this.build_collection
						=	function(req,parsed,raw_collection,partial)
							{
								console.log("Resource.build_collection")
								var	deferred
								=	Q.defer()
								,	self
								=	this

								Q.all(
									_.map(
										raw_collection.data
									,	function(data)
										{
											return self.build_resource(req,data,partial)
										}
									)
								).then(
									function(collection)
									{
										deferred
											.resolve(
												new HAL.Collection(
														collection
													,	self.url()
													,	_.extend(
															parsed.body.collection_query
														,	{
																count: raw_collection.count
															}
														)
													)
											)
									}
								)
								
								return deferred.promise
							}

						this.delete_resource
						=	function(req,id,raw_data)
							{
								console.log("Resource.delete_resource")
								delete	this.store[id]

								return	Resources['Status_codes']
												.resolve(
													_.extend(
														req
													,	{
															status_code: raw_data.code
														}
													)
												)
							}
						
						//	Search a resource in the Store (DB).
						this.show
						=	function(req,parsed,partial)
							{
								console.log("Resource.show")
								var	deferred
								=	Q.defer()
								,	self
								=	this

								partial
								=	partial
								||	false
								
								Store
									.show(this.name,parsed.id)
									.then(
										function(raw_data)
										{
											console.log("Resource.raw_data")
											self
												.build_resource(req,raw_data,partial)
												.then(
													function(hal_resource)
													{
														console.log("Resource.hal_resource")
														_.extend(
															hal_resource
														,	{
																name: _.str.strLeftBack(self.name,'s')
															}
														)
														deferred
															.resolve(
																hal_resource
															)
													}
												)
										}
									)

								return deferred.promise
							}

						//	Search a set of resources from the Store (DB)
						this.list
						=	function(req,parsed,partial)
							{
								console.log("Resource.list")
								var	deferred
								=	Q.defer()
								,	self
								=	this
								
								partial
								=	partial
								||	false

								Store
									.list(this.name,parsed.query)
									.then(
										function(raw_data)
										{
											console.log("Collection.raw_data")
											self
												.build_collection(req,parsed,raw_data,partial)
												.then(
													function(hal_collection)
													{
														console.log("Collection.hal_collection")
														_.extend(
															hal_collection
														,	{
																name: self.name
															}
														)
														deferred
															.resolve(
																hal_collection
															)
													}
												)
										}
									)

								return deferred.promise
							}

						//	Ask the Store (DB) to filter the resource collection given a set of data and add the resources obteined in the local store. If a resource exists in the local store it will be updated.
						this.filter
						=	function(req,parsed,partial)
							{
								console.log("Resource.filter")
								var	deferred
								=	Q.defer()
								,	self
								=	this
								,	store_func
								=	_.isDefined(parsed.body.through)
									?	'filter_through'
									:	'filter'
								
								partial
								=	partial
								||	false

								Store[store_func](this.name,parsed.body)
									.then(
										function(raw_data)
										{
											console.log("Collection.raw_data")
											self
												.build_collection(req,parsed,raw_data,partial)
												.then(
													function(hal_collection)
													{
														console.log("Collection.hal_collection")
														_.extend(
															hal_collection
														,	{
																name: self.name
															}
														)
														deferred
															.resolve(
																hal_collection
															)
													}
												)
										}
									)

								return deferred.promise
							}
						
						this.find
						=	function(req,parsed,partial)
							{
								console.log("Resource.find")
								var	deferred
								=	Q.defer()
								,	self
								=	this
								,	store_func
								=	parsed.body.through
									?	'find_through'
									:	'find'
								
								partial
								=	partial
								||	false

								Store
									Store[store_func](this.name,parsed.body)
									.then(
										function(raw_data)
										{
											console.log("Resource.raw_data")
											self
												.build_resource(req,raw_data,partial)
												.then(
													function(hal_resource)
													{
														console.log("Resource.hal_resource")
														_.extend(
															hal_resource
														,	{
																name: _.str.strLeftBack(self.name,'s')
															}
														)
														deferred
															.resolve(
																hal_resource
															)
													}
												)
										}
									)

								return deferred.promise
							}

						//	Ask the Store (DB) to update the given resource and if it exists in the local store it will be updated as well.
						this.update
						=	function(req,parsed)
							{
								console.log("Resource.update")
								var	deferred
								=	Q.defer()
								,	self
								=	this

								Store
									.update(this.name,parsed.id,_.omit(parsed.body,["query","collection_query"]))
									.then(
										function(raw_data)
										{
											self
												.build_resource(req,raw_data)
												.then(
													function(hal_resource)
													{
														_.extend(
															hal_resource
														,	{
																name: _.str.strLeftBack(self.name,'s')
															}
														)
														deferred
															.resolve(
																hal_resource
															)
													}
												)
										}
									)

								return	deferred.promise
							}

						//	Ask the Store (DB) to delete the given resource and if it exists in the local store it will be deleted as well.
						this.delete
						=	function(req,parsed)
							{
								console.log("Resource.delete")
								var	deferred
								=	Q.defer()
								,	self
								=	this

								Store
									.delete(this.name,parsed.id)
									.then(
										function(raw_data)
										{
											self
												.delete_resource(req,parsed.id,raw_data)
												.then(
													function(hal_resource)
													{
														_.extend(
															hal_resource
														,	{
																name: _.str.strLeftBack(self.name,'s')
															}
														)
														deferred
															.resolve(
																hal_resource
															)
													}
												)
										}
									)

								return	deferred.promise
							}

						//	Ask the Store (DB) to create a given resource and if will created in the local store as well.
						this.create
						=	function(req,parsed)
							{
								console.log("Resource.create")
								var	deferred
								=	Q.defer()
								,	self
								=	this

								Store
									.create(this.name,parsed.body.query)
									.then(
										function(raw_data)
										{
											self
												.build_resource(req,raw_data)
												.then(
													function(hal_resource)
													{
														_.extend(
															hal_resource
														,	{
																name: _.str.strLeftBack(self.name,'s')
															}
														)
														deferred
															.resolve(
																hal_resource
															)
													}
												)
										}
									)

								return	deferred.promise
							}

						//	Ask the Store (DB) to join the given resource using a set of data.
						this.join
						=	function(req,parsed)
							{
								return	Store.find(this.name,parsed.id)
							}
					}

					function Status_codes()
					{
						this.name
						=	'status_codes'

						this.store
						=	new Object()

						var self
						=	this

						this.url
						=	function(code)
							{
								return	URL.format(
												{
													protocol:	config.server.protocol
												,	hostname:	config.server.host
												,	port:		config.server.port
												,	pathname:	config.server.base+'/'+this.name+'/'+code
												}
											)
							}

						_.each(
							config.status_codes
						,	function(status,code)
							{
								_.extend(
									self.store
								,	_.object(
										[code]
									,	[
											new HAL.Resource(
													{
														code:	code
													,	status:	status
													}
												,	self.url(code)
												)
										]
									)
								)
							}
						)

						this.resolve
						=	function(req)
							{
								console.log("Status_code.resolve")
								var	deferred
								=	Q.defer()

								deferred
									.resolve(
										this.store[req.status_code]
									)
								
								return deferred.promise
							}
					}

					_.each(
						transforms
					,	function(transform_data,transform_name)
						{
							_.extend(
								Resources
							,	_.object(
									[_.str.capitalize(transform_name)]
								,	[
										new	Resource(transform_name,transform_data,mappings[transform_data.storage.name])
									]
								)
							)
						}
					)

					_.extend(
						Resources
					,	_.object(
							['Status_codes']
						,	[
								new	Status_codes()
							]
						)
					)

					return Resources
				}
	}
if(
	typeof module === 'undefined'
)
	this['ModelBuilder']
	=	Factory
else
	module.exports
	=	Factory

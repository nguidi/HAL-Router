var	_
=	require('underscore')
	_.str
=	require('underscore.string')
,	uritemplate
=	require('./uritemplates.js').parse
,	Q
=	require('q')

module.exports
=	function(app)
	{
		return	function(name,source,assoc)
		{
			this.name
			=	name

			this.target
			=	assoc.target

			this.source
			=	source

			this.parent
			=	assoc.parent

			this.parent_key
			=	assoc.parent_key

			this.type
			=	assoc.type

			this.curies
			=	app.get('curies')[this.type.split(':')[0]]

			this.key
			=	assoc.key
			||	'id'	//	TODO: Obtener clave principal segun el mapping

			this.target_key
			=	assoc.target_key
			||	'id'	//	TODO: Obtener Clave principal segun el mapping

			this.attrs
			=	assoc.attrs

			this.through
			=	assoc.through

			this.through_key
			=	assoc.through_key
			
			this.through_target_key
			=	assoc.through_target_key

			this.collection
			=	assoc.collection
			||	{
					type:	'list'
				,	page:	1
				,	ipp:	10
				}

			this.embedded
			=	assoc.embedded
			||	'none'

			this.model_assoc_template
			=	_.isUndefined(assoc.template)
				?	uritemplate(
						'/{model_name}/{model_key}/{model_assoc}'
					)
				:	uritemplate(
						assoc.template
					)

			this.get_link_assoc
			=	function(splited)
				{
					return	_.find(
								app.get('Model')[splited[1]].associations
							,	function(assoc)
								{
									return	_.isEqual(assoc.name,_.last(splited))
								}
							)
				}


			this.get_body
			=	function(data)
				{
					return	_.isEqual(this.type,'link')
							?	this.get_link_body(data)
							:	{
									action:		this.get_method()
								,	query:		this.get_query(data)
								,	through:	this.get_through(data)
								,	collection_query:	this.collection
								}
				}

			this.get_link_body
			=	function(data)
				{
					var	splited
					=	this.url(data).split('/')

					return	_.isEqual(splited.length,2)
							?	this.collection
							: 	_.isEqual(splited.length,3)
								?	splited[1]
								:	this.get_link_assoc(splited).get_body({id: splited[2]})
				}

			this.get_method
			=	function(data)
				{
					return	_.isEqual(this.type,'has-one')	||	_.isEqual(this.type,'belongs-to')
							?	'findOneBy'
							:	_.isEqual(this.type,'has-one:through')
								?	'findOneThrough'
								:	_.isEqual(this.type,'has-many')
									?	'findAllBy'
									:	_.isEqual(this.type,'link')
										?	this.get_link_method(data)
										:	'findAllThrough'
				}

			this.get_link_method
			=	function(data)
				{
					var	splited
					=	this.url(data).split('/')

					return	_.isEqual(splited.length,2)
							?	'findAll'
							:	_.isEqual(splited.length,3)
								?	'findOne'
								:	this.get_link_assoc(splited).get_method({id: splited[2]})
				}

			this.get_query
			=	function(data)
				{
					return	[
								_.isUndefined(this.through)
								?	{
										key:	this.target_key
									,	value:	data[this.key]
									}
								:	{}
							]
				}

			this.get_through
			=	function(data)
				{
					var	source
					=	this.source
					,	parent
					=	this.parent

					return	_.isUndefined(this.through)
							?	undefined
							:	{
									name:				this.through
								,	target_key:			this.target_key
								,	through_key:		this.through_key
													||	_.find(
															app.get('Model')[
																_.isEqual(assoc.type,"has-and-belongs-to-many")
																?	assoc.target
																:	assoc.through
																].associations
														,	function(through_assoc)
															{
																//aca!!!
																return	through_assoc.target == source.name
																	||	through_assoc.target ==	parent	
															}
														)[
															_.isEqual(assoc.type,"has-and-belongs-to-many")
															?	'through_target_key'
															:	'key'
														]
				
								,	value:				data[this.key]
								,	through_target_key:	_.isUndefined(this.through_target_key)
														?	_.isEqual(assoc.type,"has-and-belongs-to-many")
															?	this.target_key
															:	_.find(
																	app.get('Model')[assoc.target].associations
																,	function(through_assoc)
																	{
																		return	through_assoc.target == assoc.through
																	}
																)[
																	_.str.include(this.type,'has-many')
																	?	'through_target_key'
																	:	'key'
																]
														:	this.through_target_key
								}
				}

			this.get_model
			=	function(data)
				{
					return	_.isEqual(this.type,'link')
							?	this.get_link_model(data)
							:	app.get('Model')[this.target]
				}

			this.get_link_model
			=	function(data)
				{
					var	splited
					=	this.url(data).split('/')

					return	app.get('Model')[
								_.isEqual(splited.length,4)
								?	this.get_link_assoc(splited).target
								:	splited[1]
							]
				}

			this.url
			=	function(data)
				{
					return	this.model_assoc_template
									.expand(
										_.extend(
											{
												model_name:		this.source.name
											,	model_key:		data[this.source.key]
											,	model_assoc:	this.name
											}
										,	_.isUndefined(this.attrs)
											?	{}
											:	this.pick_attrs(data)
										)
									)
				}

			this.pick_attrs
			=	function(data)
				{
					var attrs
					=	this.attrs
					,	obj
					=	new Object()

					_.each(
						_.keys(attrs)
					,	function(key,i)
						{
							obj[key] = data[attrs[key]]
						}
					)

					return	obj	
				}

			this.get_link	//	TODO:	AGREGAR ATTRS POR TRANSFORM
			=	function(data)
				{
					return	{
								name:	_.isUndefined(this.attrs)
										?	this.name
										:	uritemplate(
												this.name
											).expand(
												_.extend(
													{
														model_name:		this.source.name
													,	model_key:		data[this.source.key]
													,	model_assoc:	this.name
													}
												,	this.pick_attrs(data)
												)
											).toLowerCase()
							,	href:	this.url(data)
							}
				}

			this.get_curies
			=	function()
				{
					// var	curies
					// =	new Object()
					// ,	assoc_curies
					// =	this.curies

					// _.each(
					// 	allowed
					// ,	function(curie_name)
					// 	{
					// 		curies[curie_name]
					// 		=	_.find(
					// 				assoc_curies
					// 			,	function(curie)
					// 				{
					// 					return	_.isEqual(curie.name,curie_name)
					// 				}
					// 			)
					// 	}
					// )

					// return	curies

					return	this.curies
				}

			return	this
		}
	}
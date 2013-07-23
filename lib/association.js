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

			this.get_body
			=	function(data)
				{
					return	{
								action:		this.get_method()
							,	query:		this.get_query(data)
							,	through:	this.get_through(data)
							,	collection_query:	this.collection
							}
				}

			this.get_method
			=	function()
				{
					return	_.isEqual(this.type,'has-one')	||	_.isEqual(this.type,'belongs-to')
							?	'findOneBy'
							:	_.isEqual(this.type,'has-one:through')
								?	'findOneThrough'
								:	_.isEqual(this.type,'has-many')
									?	'findAllBy'
									:	'findAllThrough'
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
					return	_.isUndefined(this.through)
							?	undefined
							:	{
									name:				this.through
								,	target_key:			this.target_key
								,	through_key:		this.through_key
													||	_.isEqual(assoc.type,"has-and-belongs-to-many")
														?	_.find(
																app.get('Model')[assoc.target].associations
															,	function(through_assoc)
																{
																	return	through_assoc.target == source.name
																}
															).through_target_key
														:	_.find(
																app.get('Model')[assoc.through].associations
															,	function(through_assoc)
																{
																	return	through_assoc.target == source.name
																}
															)['key']
								,	value:				data[this.key]
								,	through_target_key:	this.through_target_key
													||	_.isEqual(assoc.type,"has-and-belongs-to-many")
														?	this.target_key
														:	_.find(
																app.get('Model')[assoc.target].associations
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
				}

			this.get_model
			=	function()
				{
					return	app.get('Model')[this.target]
				}

			this.url
			=	function(data)
				{
					return	this.model_assoc_template
									.expand(
										{
											model_name:		this.source.name
										,	model_key:		data[this.source.key]
										,	model_assoc:	this.name
										}
									)
				}

			this.get_link	//	TODO:	AGREGAR ATTRS POR TRANSFORM
			=	function(data)
				{
					return	{
								name:	this.name
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
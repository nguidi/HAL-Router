module.exports
=	function(app)
	{
		
		var	_
		=	require('underscore')
		,	URL
		=	require('url')

		app.post(
			app.get('api_base')
		+	app.get('api_signin')
		,	function(req,res)
			{
				var	user_model
				=	app.get('Model')[app.get('api_users')]

				if	(_.isEmpty(req.body))
					res.send(
						app.build.status(400)
					)
				else
					user_model
						.findOneBy(req.body)
						.then(
							function(data)
							{
								app
									.build
										.resource(
											req
										,	user_model
										,	data
										).then(
											function(resource)
											{
												res.send(
													resource
												)
											}
										)
							}
						)
			}
		)

		app.get(
			app.get('api_base')
		+	app.get('api_signout')
		,	function(req,res)
			{
				req.session
				=	null

				res.send(
					app.build.status(200)
				)
			}
		)

		app.post(
			app.get('api_base')
		+	app.get('api_signup')
		,	function(req,res)
			{
				var	user_model
				=	app.get('Model')[app.get('api_users')]

				if	(_.isEmpty(req.body))
					res.send(
						app.build.status(400)
					)
				else
					user_model
						.create(req.body)
						.then(
							function(data)
							{
								app
									.build
										.resource(
											req
										,	user_model
										,	data
										).then(
											function(resource)
											{
												res.send(
													app.build.status(200)
												)
											}
										,	function()
											{
												res.send(
													app.build.status(400)
												)
											}
										)
							}
						)
			}
		)
	}
const github = require('@actions/github');
const core = require('@actions/core');
const table = require('markdown-table');

function renderREADME(followersUrl, totalFollowers, selectedFollowers) {
  const readme = `# Hi, I'm Robert Soriano.
    I'm a software developer based in Manila, PH specializing in building websites and applications.
    
    Have a project you'd like to discuss?
    Let's chat <a href="mailto:=sorianorobertc@gmail.com?Subject=Hello" target="_top">sorianorobertc@gmail.com</a>
    
    ## My Followers ([${totalFollowers}](${followersUrl}))
    
    ${generateTables(selectedFollowers)}`;

  return Buffer.from(readme.replace(/^ {4}/gm, '')).toString('base64');
}

function generateTables(followers) {
  if (!followers.length) return;

  if (followers.length > 4) {
    const top = followers.slice(0, 4);
    const bottom = followers.slice(4);

    const tbl1 = table(
      [top.map((i) => i.profilePicture), top.map((i) => i.profileUrl)],
      {
        align: top.map(() => 'c'),
      }
    );

    const tbl2 = table(
      [bottom.map((i) => i.profilePicture), bottom.map((i) => i.profileUrl)],
      {
        align: bottom.map(() => 'c'),
      }
    );

    return `${tbl1}\n\n${tbl2}`;
  }

  return table(
    [
      followers.map((i) => i.profilePicture),
      followers.map((i) => i.profileUrl),
    ],
    {
      align: top.map(() => 'c'),
    }
  );
}

async function run() {
  try {
    const octokit = github.getOctokit(process.env.MY_PROFILE_TOKEN);
    const { data: user } = await octokit.users.getAuthenticated();

    const itemsPerPage = 100; // Max is 100
    const noOfPages = Math.ceil(user.followers / itemsPerPage);
    const page = Math.floor(Math.random() * noOfPages) + 1;

    const {
      data: followers,
    } = await octokit.users.listFollowersForAuthenticatedUser({
      per_page: itemsPerPage,
      page,
    });

    const shuffledFollowers = [...followers].sort(() => 0.5 - Math.random());
    const selected = shuffledFollowers.slice(0, 8).map((item) => {
      return {
        profilePicture: `<img src="${item.avatar_url}" width="150" height="150" />`,
        profileUrl: `[${item.login}](${item.html_url})`,
      };
    });

    const REPO_NAME = user.login;

    const {
      data: { sha },
    } = await octokit.repos.getReadme({
      owner: user.login,
      repo: REPO_NAME,
    });

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: user.login,
      repo: REPO_NAME,
      path: 'README.md',
      sha,
      message: 'Update README.md',
      committer: {
        name: user.name,
        email: user.email,
      },
      content: renderREADME(
        `https://github.com/${user.login}?tab=followers`,
        user.followers,
        selected
      ),
    });

    console.log(data);
  } catch (err) {
    core.setFailed(err);
  }
}

run();
